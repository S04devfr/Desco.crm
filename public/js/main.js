// Main JS for DESCO CRM

// Global Toast Function
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    }[type] || 'bg-blue-500';
    
    toast.innerHTML = `
        <div class="${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="text-xl">&times;</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => toast.remove(), 5000);
}

// Global Search
document.getElementById('globalSearch')?.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 2) {
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        let html = '';
        
        // Clients
        if (results.clients.length > 0) {
            html += '<div class="p-4 border-b"><p class="font-semibold text-sm text-gray-700 mb-2">👥 Kontaktlar</p>';
            results.clients.forEach(client => {
                html += `<p class="text-sm py-1 hover:bg-gray-100 px-2 cursor-pointer">${client.name} (${client.phone})</p>`;
            });
            html += '</div>';
        }
        
        // Deals
        if (results.deals.length > 0) {
            html += '<div class="p-4 border-b"><p class="font-semibold text-sm text-gray-700 mb-2">🚀 Sdelkalar</p>';
            results.deals.forEach(deal => {
                html += `<p class="text-sm py-1 hover:bg-gray-100 px-2 cursor-pointer">#${deal.id} - ${deal.productName}</p>`;
            });
            html += '</div>';
        }
        
        if (html === '') {
            html = '<div class="p-4 text-center text-gray-500 text-sm">Natija topilmadi</div>';
        }
        
        document.getElementById('searchResults').innerHTML = html;
        document.getElementById('searchResults').classList.remove('hidden');
    } catch (error) {
        console.error('Search error:', error);
    }
});

// Logout function
function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => window.location.href = '/login')
        .catch(error => console.error('Logout error:', error));
}

// Check authentication on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/api/auth/me');
        if (response.status === 401) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
});