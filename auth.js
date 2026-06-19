import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
        import {
            getAuth,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut,
            onAuthStateChanged
        } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
        import {
            getFirestore,
            doc,
            getDoc,
            setDoc,
            serverTimestamp
        } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyBt3RGMsGNJXNumbNpMbf5J45je_82hNJ0",
            authDomain: "pushapp-a448c.firebaseapp.com",
            projectId: "pushapp-a448c",
            storageBucket: "pushapp-a448c.firebasestorage.app",
            messagingSenderId: "869195098196",
            appId: "1:869195098196:web:7cb8179aaea3eb8963e5c1",
            measurementId: "G-3QYY1EZ7G6"
        };

        const firebaseApp = initializeApp(firebaseConfig);
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let activeUser = null;
        let cloudSaveTimer = null;
        let cloudLoaded = false;

        window.showAuthOverlay = function() {
            document.body.classList.add('auth-locked');
        };

        function hideAuthOverlay() {
            document.body.classList.remove('auth-locked');
        }

        function getAuthFields() {
            return {
                email: document.getElementById('authEmail').value.trim(),
                password: document.getElementById('authPassword').value
            };
        }

        function authToast(title, message, icon = '✓') {
            if (window.showToast) window.showToast(title, message, icon);
        }

        async function saveCloudDataNow(data = window.getPushAppCloudData?.()) {
            if (!activeUser || !data) return;
            try {
                await setDoc(doc(db, 'users', activeUser.uid), {
                    ...data,
                    email: activeUser.email || '',
                    cloudUpdatedAt: serverTimestamp()
                }, { merge: true });
            } catch (error) {
                authToast('Cloud sync paused', 'Progress is still saved locally on this device.', '!');
                console.warn('Firestore save failed:', error);
            }
        }

        window.queueCloudSave = function(data) {
            if (!activeUser || !cloudLoaded) return;
            clearTimeout(cloudSaveTimer);
            cloudSaveTimer = setTimeout(() => saveCloudDataNow(data), 1200);
        };

        async function loadCloudData(user) {
            activeUser = user;
            cloudLoaded = false;
            try {
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    window.applyPushAppCloudData?.(snap.data());
                    authToast('Cloud progress loaded', 'Your PushApp data is synced.', '✓');
                } else {
                    await saveCloudDataNow(window.getPushAppCloudData?.());
                    authToast('Cloud profile created', 'Your local progress is backed up.', '✓');
                }
                cloudLoaded = true;
            } catch (error) {
                cloudLoaded = true;
                authToast('Using local backup', 'Cloud data could not load, so local progress is active.', '!');
                console.warn('Firestore load failed:', error);
            }
        }

        window.pushAppSignUp = async function() {
            const { email, password } = getAuthFields();
            if (!email || password.length < 6) {
                authToast('Check details', 'Use an email and a password with at least 6 characters.', '!');
                return;
            }

            try {
                await createUserWithEmailAndPassword(auth, email, password);
                localStorage.setItem('pushApp_LastAuthAt', String(Date.now()));
                authToast('Account created', 'You are signed in to PushApp.', '✓');
            } catch (error) {
                authToast('Sign up failed', error.message.replace('Firebase: ', ''), '!');
            }
        };

        window.pushAppSignIn = async function() {
            const { email, password } = getAuthFields();
            if (!email || !password) {
                authToast('Missing details', 'Enter your email and password.', '!');
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
                localStorage.setItem('pushApp_LastAuthAt', String(Date.now()));
                authToast('Signed in', 'Welcome back to PushApp.', '✓');
            } catch (error) {
                authToast('Log in failed', error.message.replace('Firebase: ', ''), '!');
            }
        };

        window.pushAppSignOut = async function() {
            await signOut(auth);
            localStorage.removeItem('pushApp_LastAuthAt');
            if (window.switchTab) window.switchTab('profile');
            window.showAuthOverlay();
            authToast('Signed out', 'Your local data is still saved on this device.', '✓');
        };

        onAuthStateChanged(auth, async (user) => {
            const signedOut = document.getElementById('authSignedOut');
            const status = document.getElementById('authStatus');
            const profileStatus = document.getElementById('profileAuthStatus');
            const profileEmail = document.getElementById('profileAccountEmail');
            const profileSignedIn = document.getElementById('profileSignedIn');
            const profileSignedOut = document.getElementById('profileSignedOut');

            if (user) {
                activeUser = user;
                const lastAuthAt = parseInt(localStorage.getItem('pushApp_LastAuthAt')) || Date.now();
                localStorage.setItem('pushApp_LastAuthAt', String(lastAuthAt));

                if (Date.now() - lastAuthAt > THIRTY_DAYS_MS) {
                    signOut(auth);
                    window.showAuthOverlay();
                    authToast('Login expired', 'Please log in again to continue.', '!');
                    return;
                }

                await loadCloudData(user);
                hideAuthOverlay();
                signedOut.style.display = 'grid';
                status.innerText = user.email || 'Signed in';
                if (profileStatus) profileStatus.innerText = user.email || 'Signed in';
                if (profileEmail) profileEmail.innerText = user.email || 'Signed in';
                if (profileSignedIn) profileSignedIn.style.display = 'block';
                if (profileSignedOut) profileSignedOut.style.display = 'none';
            } else {
                activeUser = null;
                cloudLoaded = false;
                signedOut.style.display = 'grid';
                status.innerText = 'Signed out';
                if (profileStatus) profileStatus.innerText = 'Signed out';
                if (profileSignedIn) profileSignedIn.style.display = 'none';
                if (profileSignedOut) profileSignedOut.style.display = 'block';
                window.showAuthOverlay();
            }
        });
