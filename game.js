document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const gameOverScreen = document.getElementById('gameOver');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const finalScoreDisplay = document.getElementById('finalScore');

    // Game variables
    let score = 0;
    let highScore = localStorage.getItem('ninjaHighScore') || 0;
    let gameRunning = false;
    let fruits = [];
    let bombs = [];
    let slices = [];
    let lastTimestamp = 0;
    let fruitSpawnTimer = 0;
    let bombSpawnTimer = 0;
    let mouseX = 0;
    let mouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseTrail = [];
    const trailLength = 10;

    // Game settings
    const fruitSpawnInterval = 800; // ms
    const bombSpawnInterval = 2000; // ms
    const minVelocity = 5;
    const maxVelocity = 15;
    const gravity = 0.25;
    const fruitRadius = 30;
    const bombRadius = 30;
    const trailRadius = 5;

    // Images
    const fruitImages = [];
    const fruitTypes = ['flappy_crab.png', 'balloon.png', 'crab_star.png'];
    const bombImage = new Image();
    bombImage.src = '../hat.png';

    // Load fruit images
    fruitTypes.forEach(type => {
        const img = new Image();
        img.src = `../${type}`;
        fruitImages.push(img);
    });

    // Set canvas size
    function resizeCanvas() {
        // Check if mobile device
        const isMobile = window.innerWidth <= 768;
        
        // Set optimal canvas dimensions that will fit most screens while keeping proper aspect ratio
        const maxWidth = isMobile ? 450 : 700;
        const maxHeight = isMobile ? 350 : 450;
        const aspectRatio = 16 / 9;
        
        // Calculate responsive dimensions
        let width = Math.min(window.innerWidth * (isMobile ? 0.95 : 0.75), maxWidth);
        let height = width / aspectRatio;
        
        // If height is too large, scale down width proportionally
        if (height > window.innerHeight * (isMobile ? 0.5 : 0.6)) {
            height = window.innerHeight * (isMobile ? 0.5 : 0.6);
            width = height * aspectRatio;
        }
        
        // Set canvas dimensions
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        
        // Update game scaling if needed
        updateGameScale();
    }
    
    // Update game scale factors based on canvas size
    function updateGameScale() {
        // This function can be used to scale game elements based on canvas size
        // For example, adjust fruitRadius, bombRadius based on canvas dimensions
        const isMobile = window.innerWidth <= 768;
        const scaleFactor = Math.min(canvas.width / 700, canvas.height / 450);
        const minScale = isMobile ? 0.3 : 0.4;
        const maxScale = isMobile ? 0.7 : 0.9;
        const adjustedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));
        
        // Scale game elements
        const baseRadius = isMobile ? 20 : 25;
        fruitRadius = baseRadius * adjustedScale;
        bombRadius = baseRadius * adjustedScale;
    }
    
    // Button events with improved touch responsiveness
    function attachButtonEvents() {
        // Helper function to improve touch responsiveness
        function addTouchResponsiveness(button, callback) {
            if (!button) return;
            
            // Normal click event
            button.addEventListener('click', callback);
            
            // Better touch handling
            button.addEventListener('touchstart', function(e) {
                e.preventDefault();
                button.classList.add('button-touched');
            }, { passive: false });
            
            button.addEventListener('touchend', function(e) {
                e.preventDefault();
                button.classList.remove('button-touched');
                callback(e);
            }, { passive: false });
        }
        
        // Add touch responsiveness to all interactive buttons
        addTouchResponsiveness(document.getElementById('startGameBtn'), startGame);
        addTouchResponsiveness(document.getElementById('restartButton'), startGame);
        addTouchResponsiveness(document.getElementById('mainMenuButton'), () => showScreen(document.getElementById('mainMenu')));
        addTouchResponsiveness(document.getElementById('settingsBtn'), () => showScreen(document.getElementById('settingsScreen')));
        addTouchResponsiveness(document.getElementById('settingsBackBtn'), () => showScreen(document.getElementById('mainMenu')));
        addTouchResponsiveness(document.getElementById('highScoresBtn'), () => showScreen(document.getElementById('highScoresScreen')));
        addTouchResponsiveness(document.getElementById('backToMenuBtn'), () => showScreen(document.getElementById('mainMenu')));
        addTouchResponsiveness(document.getElementById('howToPlayBtn'), () => showScreen(document.getElementById('howToPlayScreen')));
        addTouchResponsiveness(document.getElementById('howToPlayBackBtn'), () => showScreen(document.getElementById('mainMenu')));
        
        // Difficulty setting buttons
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            addTouchResponsiveness(btn, (e) => {
                // Remove active class from all buttons
                difficultyBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Set game difficulty based on button data attribute
                const difficulty = e.target.getAttribute('data-difficulty');
                setGameDifficulty(difficulty);
            });
        });
    }
    
    // Initialize game
    function init() {
        resizeCanvas();
        updateGameScale();
        window.addEventListener('resize', resizeCanvas);
        highScoreDisplay.textContent = highScore;
        
        // Dokunma ve kaydırma davranışlarını engelleyelim
        document.addEventListener('touchmove', function(e) {
            if (gameRunning) {
                e.preventDefault(); // Oyun çalışırken kaydırmayı engelle
            }
        }, { passive: false });
        
        // Double tap zoom'u engelleyelim
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            const lastTouch = window.lastTouch || now + 1000;
            const delta = now - lastTouch;
            if (delta < 300 && delta > 0) {
                e.preventDefault();
            }
            window.lastTouch = now;
        }, { passive: false });
        
        // Mouse events
        canvas.addEventListener('mousemove', handleMouseMove);
        
        // Touch events for mobile devices
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Setup all button events with improved touch responsiveness
        attachButtonEvents();
        
        // Initially show main menu
        showScreen(document.getElementById('mainMenu'));
    }
    
    // Mouse move handler (extract from existing code)
    function handleMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // pageX ve pageY kullanarak hesaplama yapıyoruz - bu genelde daha doğru sonuç verir
        mouseX = ((e.pageX - rect.left) * scaleX);
        mouseY = ((e.pageY - rect.top) * scaleY);
            
            // Add point to trail
            mouseTrail.push({x: mouseX, y: mouseY});
            if (mouseTrail.length > trailLength) {
                mouseTrail.shift();
            }
            
            // Slice fruits
            if (gameRunning) {
                checkSlice();
            }
    }
    
    // Touch event handlers for mobile
    function handleTouchStart(e) {
        e.preventDefault(); // Prevent default touch actions
        
        // Clear previous trail when starting a new touch
        mouseTrail = [];
        
        const touch = e.touches[0];
        handleTouch(touch);
    }
    
    function handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling while playing
        
        const touch = e.touches[0];
        handleTouch(touch);
        
        // Check for fruit slicing
        if (gameRunning) {
            checkSlice();
        }
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        // Clear trail after touch ends
        setTimeout(() => {
            mouseTrail = [];
        }, 100);
    }
    
    function handleTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Mobil cihazlar için daha kesin sonuç veren pozisyon hesaplama
        // getBoundingClientRect metodu sayfa scroll'unu zaten hesaba katıyor
        mouseX = ((touch.clientX - rect.left) * scaleX);
        mouseY = ((touch.clientY - rect.top) * scaleY);
        
        // Mobil cihazlarda koordinat kaymasını önlemek için offset değerleri
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Mobil cihazlarda dokunmatik hassasiyeti için offset düzeltmesi
            // Eğer hala kaydırma varsa, bu değerleri ayarlayın
            const offsetX = 0; // Gerekirse X ekseninde düzeltme için değeri değiştirin
            const offsetY = -20; // Y ekseninde yukarı doğru 20 piksel düzeltme
            mouseX += offsetX;
            mouseY += offsetY;
        }
        
        // Add point to trail
        mouseTrail.push({x: mouseX, y: mouseY});
        if (mouseTrail.length > trailLength) {
            mouseTrail.shift();
        }
    }
    
    // Start game
    function startGame() {
        gameRunning = true;
        score = 0;
        scoreDisplay.textContent = score;
        fruits = [];
        bombs = [];
        slices = [];
        mouseTrail = [];
        startButton.style.display = 'none';
        gameOverScreen.classList.add('hidden');
        requestAnimationFrame(gameLoop);
    }
    
    // Game over
    function endGame() {
        gameRunning = false;
        startButton.style.display = 'block';
        gameOverScreen.classList.remove('hidden');
        finalScoreDisplay.textContent = score;
        
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.textContent = highScore;
            localStorage.setItem('ninjaHighScore', highScore);
        }
    }
    
    // Check for slices
    function checkSlice() {
        if (mouseTrail.length < 2) return;
        
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Mobil cihazlar için daha düşük eşik değeri
        const isMobile = window.innerWidth <= 768;
        const distanceThreshold = isMobile ? 3 : 5;
        
        // Daha düşük eşik değeri ile kesimi daha hassas hale getiriyoruz
        if (distance > distanceThreshold) {
            // Farenin şu anki konumu ve birkaç önceki konumu arasında çizgi çizip
            // meyve ve bombalarla kesişim kontrolü yapıyoruz
            const trailPointCount = isMobile ? 10 : 5; // Mobil cihazlarda daha uzun trail
            const trailPoints = mouseTrail.slice(-trailPointCount); // Son birkaç nokta
            
            // Check fruits
            fruits.forEach((fruit, index) => {
                let sliced = false;
                
                // Öncelikle fare pozisyonuyla meyve arasındaki mesafeyi kontrol ediyoruz
                const dist = Math.sqrt((mouseX - fruit.x) ** 2 + (mouseY - fruit.y) ** 2);
                // Mobil cihazlar için daha geniş kesim alanı
                const hitRadius = isMobile ? fruitRadius * 1.5 : fruitRadius;
                
                if (dist < hitRadius) {
                    sliced = true;
                } else {
                    // Fare izi ile meyve arasında kesişim olup olmadığını kontrol ediyoruz
                    for (let i = 1; i < trailPoints.length; i++) {
                        const p1 = trailPoints[i-1];
                        const p2 = trailPoints[i];
                        
                        // Çizgi ile meyve arasındaki kesişimi kontrol et
                        if (lineCircleIntersection(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, hitRadius)) {
                            sliced = true;
                            break;
                        }
                    }
                }
                
                if (sliced) {
                    sliceFruit(index);
                }
            });
            
            // Check bombs
            bombs.forEach((bomb, index) => {
                let hit = false;
                
                // Öncelikle fare pozisyonuyla bomba arasındaki mesafeyi kontrol ediyoruz
                const dist = Math.sqrt((mouseX - bomb.x) ** 2 + (mouseY - bomb.y) ** 2);
                // Mobil cihazlar için daha geniş kesim alanı
                const hitRadius = isMobile ? bombRadius * 1.3 : bombRadius;
                
                if (dist < hitRadius) {
                    hit = true;
                } else {
                    // Fare izi ile bomba arasında kesişim olup olmadığını kontrol ediyoruz
                    for (let i = 1; i < trailPoints.length; i++) {
                        const p1 = trailPoints[i-1];
                        const p2 = trailPoints[i];
                        
                        // Çizgi ile bomba arasındaki kesişimi kontrol et
                        if (lineCircleIntersection(p1.x, p1.y, p2.x, p2.y, bomb.x, bomb.y, hitRadius)) {
                            hit = true;
                            break;
                        }
                    }
                }
                
                if (hit) {
                    hitBomb();
                }
            });
        }
    }
    
    // Slice fruit
    function sliceFruit(index) {
        // Add slice effect
        slices.push({
            x: fruits[index].x,
            y: fruits[index].y,
            radius: fruitRadius,
            alpha: 1
        });
        
        // Update score
        score += 10;
        scoreDisplay.textContent = score;
        
        // Remove fruit
        fruits.splice(index, 1);
    }
    
    // Hit bomb
    function hitBomb() {
        endGame();
    }
    
    // Spawn fruit
    function spawnFruit() {
        const x = Math.random() * (canvas.width - fruitRadius * 2) + fruitRadius;
        const vx = (Math.random() * 2 - 1) * maxVelocity;
        const vy = -minVelocity - Math.random() * (maxVelocity - minVelocity);
        const type = Math.floor(Math.random() * fruitImages.length);
        
        fruits.push({
            x,
            y: canvas.height + fruitRadius,
            vx,
            vy,
            type
        });
    }
    
    // Spawn bomb
    function spawnBomb() {
        const x = Math.random() * (canvas.width - bombRadius * 2) + bombRadius;
        const vx = (Math.random() * 2 - 1) * maxVelocity;
        const vy = -minVelocity - Math.random() * (maxVelocity - minVelocity);
        
        bombs.push({
            x,
            y: canvas.height + bombRadius,
            vx,
            vy
        });
    }
    
    // Update game state
    function update(timestamp) {
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        
        // Spawn fruit
        fruitSpawnTimer += deltaTime;
        if (fruitSpawnTimer >= fruitSpawnInterval) {
            spawnFruit();
            fruitSpawnTimer = 0;
        }
        
        // Spawn bomb
        bombSpawnTimer += deltaTime;
        if (bombSpawnTimer >= bombSpawnInterval) {
            spawnBomb();
            bombSpawnTimer = 0;
        }
        
        // Update fruits
        fruits.forEach((fruit, index) => {
            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            fruit.vy += gravity;
            
            // Remove fruit if offscreen
            if (fruit.y > canvas.height + fruitRadius) {
                fruits.splice(index, 1);
            }
        });
        
        // Update bombs
        bombs.forEach((bomb, index) => {
            bomb.x += bomb.vx;
            bomb.y += bomb.vy;
            bomb.vy += gravity;
            
            // Remove bomb if offscreen
            if (bomb.y > canvas.height + bombRadius) {
                bombs.splice(index, 1);
            }
        });
        
        // Update slices
        slices.forEach((slice, index) => {
            slice.alpha -= 0.05;
            slice.radius += 1;
            
            if (slice.alpha <= 0) {
                slices.splice(index, 1);
            }
        });
    }
    
    // Render game
    function render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw trail
        if (mouseTrail.length > 1) {
            // Mobil için daha belirgin trail çizimi
            const isMobile = window.innerWidth <= 768;
            
            ctx.beginPath();
            ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
            
            for (let i = 1; i < mouseTrail.length; i++) {
                ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
            }
            
            ctx.strokeStyle = 'rgba(255, 51, 255, 0.7)';
            ctx.lineWidth = isMobile ? 6 : 4;
            ctx.stroke();
            
            // Draw trail glow
            ctx.beginPath();
            ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
            
            for (let i = 1; i < mouseTrail.length; i++) {
                ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
            }
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = isMobile ? 12 : 8;
            ctx.stroke();
            
            // Draw trail points
            mouseTrail.forEach((point, index) => {
                const alpha = index / mouseTrail.length;
                ctx.beginPath();
                const pointSize = isMobile ? trailRadius * 1.5 : trailRadius;
                ctx.arc(point.x, point.y, pointSize * alpha, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 51, 255, ${alpha})`;
                ctx.fill();
            });
        }
        
        // Draw fruits
        fruits.forEach(fruit => {
            ctx.drawImage(
                fruitImages[fruit.type],
                fruit.x - fruitRadius,
                fruit.y - fruitRadius,
                fruitRadius * 2,
                fruitRadius * 2
            );
        });
        
        // Draw bombs
        bombs.forEach(bomb => {
            ctx.drawImage(
                bombImage,
                bomb.x - bombRadius,
                bomb.y - bombRadius,
                bombRadius * 2,
                bombRadius * 2
            );
        });
        
        // Draw slices
        slices.forEach(slice => {
            ctx.beginPath();
            ctx.arc(slice.x, slice.y, slice.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${slice.alpha})`;
            ctx.fill();
        });
    }
    
    // Game loop
    function gameLoop(timestamp) {
        if (gameRunning) {
            update(timestamp);
            render();
            requestAnimationFrame(gameLoop);
        }
    }
    
    // Initialize game
    init();
}); 