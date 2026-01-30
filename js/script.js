// Exemplo de interação: Mudar o fundo da Navbar ao rolar a página
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(2, 2, 2, 0.95)';
        nav.style.padding = '15px 0';
    } else {
        nav.style.background = 'rgba(2, 2, 2, 0.8)';
        nav.style.padding = '20px 0';
    }
});

console.log("Prado Vision: Script carregado com sucesso!");

// Efeito de feedback ao clicar no botão de WhatsApp
const btnWhatsapp = document.querySelector('.btn-glow');

btnWhatsapp.addEventListener('click', (e) => {
    // Opcional: Logar no console para você monitorar os cliques como Analista de TI
    console.log("Lead interessado: Redirecionando para o WhatsApp...");
    
    // Pequeno efeito visual de clique
    btnWhatsapp.style.transform = "scale(0.95)";
    setTimeout(() => {
        btnWhatsapp.style.transform = "scale(1.05)";
    }, 100);
});

// Inicializa os ícones da biblioteca Lucide
lucide.createIcons();