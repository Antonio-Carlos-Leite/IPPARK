// Referência ao auth do Firebase
const auth = firebase.auth();

// Função de login
async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'mapa.html';
  } catch (error) {
    console.error('Erro no login:', error);
    alert('Erro ao fazer login. Verifique suas credenciais.');
  }
}

// Verificação de autenticação
auth.onAuthStateChanged(user => {
  if (user && window.location.pathname.includes('index.html')) {
    window.location.href = 'mapa.html';
  }
}); 