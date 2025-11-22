// Generate random captcha on page load
let captchaAnswerInline = 0;

function generateCaptchaInline() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    captchaAnswerInline = num1 + num2;
    
    document.getElementById('captcha-num1-inline').textContent = num1;
    document.getElementById('captcha-num2-inline').textContent = num2;
    document.getElementById('captcha-answer-inline').value = '';
}

function verifyCaptchaInline() {
    const userAnswer = parseInt(document.getElementById('captcha-answer-inline').value);
    
    if (!userAnswer && userAnswer !== 0) {
        alert('Please enter an answer');
        return;
    }
    
    if (userAnswer === captchaAnswerInline) {
        document.getElementById('captcha-challenge-inline').style.display = 'none';
        document.getElementById('credentials-display-inline').style.display = 'flex';
    } else {
        alert('Incorrect answer. Please try again.');
        generateCaptchaInline();
    }
}

// Handle Enter key press in captcha input
document.addEventListener('DOMContentLoaded', function() {
    generateCaptchaInline();

    const captchaInputInline = document.getElementById('captcha-answer-inline');
    if (captchaInputInline) {
        captchaInputInline.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyCaptchaInline();
            }
        });
    }
});