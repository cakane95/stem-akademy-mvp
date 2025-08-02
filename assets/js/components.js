document.addEventListener("DOMContentLoaded", function() {
    const pageType = document.body.dataset.pageType;
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    let headerFile = './_header_main.html'; // Header par défaut
    if (pageType === 'quest') {
        headerFile = './_header_quest.html'; // Header pour les quêtes
    }

    if (headerPlaceholder) {
        fetch(headerFile)
            .then(response => response.ok ? response.text() : Promise.reject('Header not found'))
            .then(data => {
                headerPlaceholder.innerHTML = data;
            })
            .catch(error => {
                console.error('Error fetching header:', error);
                headerPlaceholder.innerHTML = '<p style="color:red; text-align:center;">Erreur de chargement du header.</p>';
            });
    }

    if (footerPlaceholder) {
        fetch('./_footer_main.html')
            .then(response => response.ok ? response.text() : Promise.reject('Footer not found'))
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => {
                console.error('Error fetching footer:', error);
                footerPlaceholder.innerHTML = '<p style="color:red; text-align:center;">Erreur de chargement du footer.</p>';
            });
    }
});