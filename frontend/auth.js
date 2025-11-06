const poolData = {
    UserPoolId: AWS_CONFIG.COGNITO_USER_POOL_ID,
    ClientId: AWS_CONFIG.COGNITO_APP_CLIENT_ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
let idToken = null;
let currentUser = null;
let currentUserRole = 'User';

const messageEl = document.getElementById('message');

function showSignUp() {
    document.getElementById('signin-section').classList.remove('active');
    document.getElementById('signup-section').classList.add('active');
    document.getElementById('upload-section').classList.remove('active');
    messageEl.style.display = 'none';
}

function showSignIn() {
    document.getElementById('signup-section').classList.remove('active');
    document.getElementById('signin-section').classList.add('active');
    document.getElementById('upload-section').classList.remove('active');
    messageEl.style.display = 'none';
}

function showUploadSection(email, role) {
    document.getElementById('signin-section').classList.remove('active');
    document.getElementById('signup-section').classList.remove('active');
    document.getElementById('upload-section').classList.add('active');
    
    document.getElementById('user-email').textContent = email;
    const roleSpan = document.getElementById('user-role');
    roleSpan.textContent = role;
    roleSpan.className = 'role-badge role-' + role.toLowerCase();
    
    currentUserRole = role;
    listFiles();
}

function signOut() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    idToken = null;
    currentUser = null;
    currentUserRole = 'User';
    document.getElementById('upload-section').classList.remove('active');
    showSignIn();
    showMessage('success', 'Signed out successfully');
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

function showMessage(type, text) {
    messageEl.className = type;
    messageEl.innerText = text;
    messageEl.style.display = 'block';
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 8000);
}

function signUpUser() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const isAdminRequest = document.getElementById('admin-request').checked;

    if (!email || !password) {
        showMessage('error', 'Please enter both email and password.');
        return;
    }

    const username = 'user_' + Date.now();
    const role = isAdminRequest ? 'admin' : 'user';

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'custom:role', Value: role })
    ];

    userPool.signUp(username, password, attributeList, null, (err, result) => {
        if (err) {
            showMessage('error', 'Sign up failed: ' + err.message);
            return;
        }
        
        if (isAdminRequest) {
            showMessage('success', 'Admin request submitted! Your account will be activated after manual approval. Please contact the administrator.');
        } else {
            showMessage('success', 'Account created successfully! You can now sign in with your email.');
            setTimeout(() => {
                document.getElementById('signin-email').value = email;
                showSignIn();
            }, 2000);
        }
    });
}

function signInUser() {
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
        showMessage('error', 'Please enter both email and password.');
        return;
    }

    const authenticationData = { Username: email, Password: password };
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const userData = { Username: email, Pool: userPool };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
            idToken = session.getIdToken().getJwtToken();
            currentUser = email;
            
            const payload = session.getIdToken().payload;
            const groups = payload['cognito:groups'];
            let role = 'User';
            
            if (groups && groups.includes('Admin-Group')) {
                role = 'Admin';
            }
            
            showMessage('success', 'Sign in successful!');
            setTimeout(() => {
                showUploadSection(email, role);
            }, 1000);
        },
        onFailure: (err) => {
            showMessage('error', 'Sign in failed: ' + err.message);
        }
    });
}