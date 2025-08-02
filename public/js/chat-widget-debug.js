// Chat Widget Debug Script
console.log('Chat Widget Debug Script Loaded');

// Check if chat widget elements exist
const chatToggler = document.getElementById('chat-widget-toggler');
const chatContainer = document.getElementById('chat-widget-container');

console.log('Chat Toggler Element:', chatToggler);
console.log('Chat Container Element:', chatContainer);

if (chatToggler) {
    // Add a test click handler directly
    chatToggler.addEventListener('click', function(e) {
        console.log('Chat toggler clicked!');
        e.preventDefault();
        e.stopPropagation();
        
        if (chatContainer) {
            console.log('Toggling chat container visibility');
            chatContainer.classList.toggle('show');
            console.log('Chat container class list:', chatContainer.className);
        }
    });
    
    // Add a test style to make the toggler more visible
    chatToggler.style.border = '2px solid red';
    chatToggler.style.padding = '10px';
    chatToggler.style.cursor = 'pointer';
    
    console.log('Test click handler added to chat toggler');
}

// Check for any CSS that might be interfering
const checkForOverlay = () => {
    const elements = document.elementsFromPoint(10, 10);
    console.log('Elements at top-left corner:', elements);
    
    // Check for any overlays or modals that might be blocking clicks
    const overlays = document.querySelectorAll('.modal, .overlay, [style*="z-index: 9999"]');
    console.log('Potential overlay elements:', overlays);
};

// Run the check after a short delay to ensure everything is loaded
setTimeout(checkForOverlay, 1000);

// Log any clicks on the document to see if they're reaching the chat toggler
document.addEventListener('click', function(e) {
    console.log('Document click detected on:', e.target);
}, true);
