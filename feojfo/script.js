// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    initAuthStateListener();
    setupAuthForm();
    setupProfilePage();
    setupIndexPage();
});

// Auth state management
function initAuthStateListener() {
    auth.onAuthStateChanged((user) => {
        updateNavigation(user);
        protectRoutes(user);
        if (user) loadUserData(user);
    });
}

// Navigation management
function updateNavigation(user) {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    navLinks.innerHTML = `
        <a href="index.html" class="nav-link">Home</a>
        <a href="exercises.html" class="nav-link">Exercises</a>
        <a href="shop.html" class="nav-link">Shop</a>
        <div class="dropdown">
            <a href="#" class="nav-link">Account ▼</a>
            <div class="dropdown-content">
                ${user ? `
                    <a href="profile.html" class="nav-link">Profile</a>
                    <a href="#" class="nav-link" id="logoutBtn">Logout</a>
                ` : `
                    <a href="auth.html?type=login" class="nav-link">Sign In</a>
                    <a href="auth.html?type=register" class="nav-link">Sign Up</a>
                `}
            </div>
        </div>
    `;

    // Add logout listener dynamically
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Route protection
function protectRoutes(user) {
    const protectedRoutes = ['profile.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedRoutes.includes(currentPage) && !user) {
        window.location.href = `auth.html?type=login&redirect=${encodeURIComponent(window.location.href)}`;
    }
}

// Auth form handling
function setupAuthForm() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || 'login';
    const redirect = params.get('redirect') || 'index.html';

    // Update form UI
    const authTitle = document.getElementById('authTitle');
    const submitBtn = document.getElementById('submitBtn');
    const authSwitch = document.getElementById('authSwitch');

    if (authTitle) authTitle.textContent = type === 'login' ? 'Sign In' : 'Create Account';
    if (submitBtn) submitBtn.textContent = type === 'login' ? 'Sign In' : 'Sign Up';
    if (authSwitch) authSwitch.innerHTML = type === 'login' 
        ? 'Need an account? <a href="auth.html?type=register">Sign Up</a>'
        : 'Already have an account? <a href="auth.html?type=login">Sign In</a>';

    // Form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            if (type === 'login') {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
            window.location.href = redirect;
        } catch (error) {
            alert(`Authentication Error: ${error.message}`);
        }
    });
}

// Profile management
function setupProfilePage() {
    if (!document.getElementById('profileView')) return;

    const editProfileBtn = document.getElementById('editProfileBtn');
    const editForm = document.getElementById('editForm');

    if (editProfileBtn) editProfileBtn.addEventListener('click', showEditForm);
    if (editForm) editForm.addEventListener('submit', updateProfile);
    
    showProfileView();
}

function showProfileView() {
    const user = auth.currentUser;
    if (!user) return;

    const profileView = document.getElementById('profileView');
    const profileEdit = document.getElementById('profileEdit');
    const userEmail = document.getElementById('userEmail');
    const userName = document.getElementById('userName');

    if (profileView) profileView.style.display = 'block';
    if (profileEdit) profileEdit.style.display = 'none';
    if (userEmail) userEmail.textContent = user.email;
    if (userName) userName.textContent = user.displayName || 'Guest';
}

function showEditForm() {
    const profileView = document.getElementById('profileView');
    const profileEdit = document.getElementById('profileEdit');
    const editName = document.getElementById('editName');

    if (profileView) profileView.style.display = 'none';
    if (profileEdit) profileEdit.style.display = 'block';
    if (editName) editName.value = auth.currentUser?.displayName || '';
}

async function updateProfile(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
        await user.updateProfile({
            displayName: document.getElementById('editName').value
        });

        await db.collection('users').doc(user.uid).set({
            age: document.getElementById('editAge').value,
            weight: document.getElementById('editWeight').value,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showProfileView();
        alert('Profile updated successfully!');
    } catch (error) {
        alert(`Update Error: ${error.message}`);
    }
}

// Routine management
function setupIndexPage() {
    const routineForm = document.getElementById('routineForm');
    if (routineForm) {
        routineForm.addEventListener('submit', saveRoutine);
    }
}

async function saveRoutine(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection('users').doc(user.uid).collection('routines').add({
            name: document.getElementById('routineName').value,
            focus: document.getElementById('routineFocus').value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Routine saved successfully!');
        loadUserData(user);
        e.target.reset();
    } catch (error) {
        alert(`Save Error: ${error.message}`);
    }
}

async function loadUserData(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || 'Guest';
            }
        }

        const routinesSnapshot = await db.collection('users').doc(user.uid)
            .collection('routines').orderBy('timestamp', 'desc').get();
        
        const routinesList = document.getElementById('savedRoutines');
        if (routinesList) {
            routinesList.innerHTML = routinesSnapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <div class="routine-card">
                        <h4>${data.name}</h4>
                        <p>Type: ${data.focus}</p>
                        <small>${data.timestamp?.toDate().toLocaleDateString()}</small>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Data load error:', error);
    }
}

// Logout function
function logout() {
    auth.signOut()
        .then(() => window.location.href = 'index.html')
        .catch(error => alert(`Logout Error: ${error.message}`));
}