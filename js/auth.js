// Regista o Service Worker para a funcionalidade PWA (App Instalável)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('Service Worker registrado com sucesso:', registration.scope))
            .catch(error => console.error('Falha ao registrar Service Worker:', error));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseConfig === 'undefined') {
        alert("ERRO GRAVE: O ficheiro de configuração (config.js) não foi encontrado.");
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.warn('Firebase já inicializado ou erro na inicialização.', e);
    }

    const auth = firebase.auth();
    const db = firebase.firestore(); // Instância do Firestore
    const loginForm = document.getElementById('login-form');
    
    // Função auxiliar para buscar o perfil e redirecionar
    const handleLoginSuccess = (user) => {
        const profileDocRef = db.collection('perfis').doc(user.uid);

        profileDocRef.get().then((doc) => {
            let userRole = 'gestor'; // Papel padrão se não houver perfil definido
            if (doc.exists && doc.data().role) {
                userRole = doc.data().role;
            } else {
                console.warn(`Perfil não encontrado no Firestore para o UID: ${user.uid}. Atribuindo papel padrão 'gestor'.`);
            }

            // Armazena a sessão completa no localStorage
            const sessionData = {
                uid: user.uid,
                email: user.email,
                role: userRole
            };
            localStorage.setItem('kumonUserSession', JSON.stringify(sessionData));

            // Redireciona com base no papel
            if (userRole === 'orientador') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }).catch(error => {
            console.error("Erro ao buscar perfil do usuário:", error);
            document.getElementById('login-error').textContent = "Erro ao carregar dados do usuário.";
        });
    };

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    handleLoginSuccess(userCredential.user);
                })
                .catch(() => {
                    document.getElementById('login-error').textContent = "Email ou senha inválidos.";
                });
        });
    }

    if (document.body.id === 'app-page' || document.body.id === 'dashboard-page') {
        auth.onAuthStateChanged(user => {
            if (user) {
                const storedSession = localStorage.getItem('kumonUserSession');
                let sessionData = storedSession ? JSON.parse(storedSession) : null;
                
                // Garante que a sessão local está sincronizada
                if (!sessionData || sessionData.uid !== user.uid) {
                    const profileDocRef = db.collection('perfis').doc(user.uid);
                    profileDocRef.get().then(doc => {
                        let userRole = (doc.exists && doc.data().role) ? doc.data().role : 'gestor';
                        sessionData = { uid: user.uid, email: user.email, role: userRole };
                        localStorage.setItem('kumonUserSession', JSON.stringify(sessionData));
                        
                        // Recarrega a página para garantir o redirecionamento correto
                        window.location.reload();
                    });
                    return; // Aguarda a busca de perfil antes de continuar
                }

                // Verificação de Acesso
                const currentPageId = document.body.id;
                if (sessionData.role === 'orientador' && currentPageId !== 'dashboard-page') {
                    return window.location.replace('dashboard.html');
                }
                if (sessionData.role === 'gestor' && currentPageId !== 'app-page') {
                    return window.location.replace('index.html');
                }

                if (typeof App !== "undefined" && App.init) {
                    App.init(sessionData, db);
                } else {
                    console.error("Objeto 'App' não definido. Verifique a ordem de carregamento dos scripts.");
                    document.getElementById('loading-overlay').innerHTML = '<p style="color:red;">Erro fatal na aplicação. Verifique a consola.</p>';
                }

            } else {
                localStorage.removeItem('kumonUserSession');
                window.location.replace('login.html');
            }
        });
    }
});
