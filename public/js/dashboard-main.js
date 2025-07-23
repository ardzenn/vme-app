document.addEventListener('DOMContentLoaded', () => {
    const orderDetailModalEl = document.getElementById('orderDetailModal');
    if (!orderDetailModalEl) return;

    const orderDetailModal = new bootstrap.Modal(orderDetailModalEl);
    const socket = io({ query: { userId: document.body.dataset.userId } });
    let currentOrderId = null;
    let attachedFile = null;

    async function viewOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            const data = await response.json();
            orderDetailModalEl.dataset.orderData = JSON.stringify(data);
            orderDetailModal.show();
        } catch (error) {
            console.error("Failed to fetch order data:", error);
            alert('Could not load order details.');
        }
    }

    function appendMessage(msg, currentUserId) {
        const chatBox = document.getElementById('modal_chatMessages');
        if (!chatBox || !msg.user) return;
        let attachmentHTML = '';
        if (msg.attachment) {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment)) {
                attachmentHTML = `<a href="${msg.attachment}" target="_blank"><img src="${msg.attachment}" class="chat-attachment-img"></a>`;
            } else {
                const filename = msg.attachment.split('/').pop();
                attachmentHTML = `<a href="${msg.attachment}" target="_blank" class="chat-attachment-file">📄 ${filename}</a>`;
            }
        }
        const isSent = msg.user._id === currentUserId;
        const messageClass = isSent ? 'chat-message-sent' : 'chat-message-received';
        const profilePic = msg.user.profilePicture || '/images/default-profile.png';
        const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userName = msg.user.firstName || 'User';
        const messageHTML = `<div class="chat-message ${messageClass}"><img src="${profilePic}" class="chat-profile-pic"><div class="chat-bubble"><div class="username">${userName}</div>${msg.text ? `<div class="chat-text">${msg.text}</div>` : ''}${attachmentHTML}<div class="timestamp">${timestamp}</div></div></div>`;
        chatBox.innerHTML += messageHTML;
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    orderDetailModalEl.addEventListener('shown.bs.modal', function (event) {
        const data = JSON.parse(event.currentTarget.dataset.orderData || '{}');
        if (!data.order) return;
        
        console.log("Order Data Received:", data.order); // Use this to debug attachment path

        const { order, messages, currentUser } = data;
        currentOrderId = order._id;

        const allElements = {
            orderUpdateForm: document.getElementById('orderUpdateForm'),
            invoiceContainer: document.getElementById('invoice_details_container'),
            editFormContainer: document.getElementById('order_edit_form_container'),
            modalFooter: document.querySelector('#orderDetailModal .modal-footer'),
            attachmentSection: document.getElementById('attachment_section'),
            chatBox: document.getElementById('modal_chatMessages'),
            chatSearchInput: document.getElementById('chat_search_input'),
            messageInput: document.getElementById('modal_messageText'),
            sendMessageBtn: document.getElementById('modal_sendMessageBtn'),
            attachBtn: document.getElementById('chat_attach_btn'),
            fileInput: document.getElementById('chat_file_input'),
            attachmentPreview: document.getElementById('chat_attachment_preview'),
        };

        allElements.chatBox.innerHTML = '';
        allElements.editFormContainer.innerHTML = '';
        
        document.getElementById('modal_customerName_header').innerText = `Order Details for: ${order.customerName}`;
        
        let productsTableRows = '';
        (order.products || []).forEach(p => { productsTableRows += `<tr><td>${p.product || 'N/A'}</td><td>${p.quantity || 0}</td><td>₱${(p.price || 0).toFixed(2)}</td><td>₱${(p.total || 0).toFixed(2)}</td></tr>`; });
        allElements.invoiceContainer.innerHTML = `<h5 class="mb-3">Order Summary</h5><div class="row"><div class="col-md-6"><p><strong>Sales Rep:</strong> ${order.user ? order.user.firstName + ' ' + order.user.lastName : 'N/A'}</p><p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p></div><div class="col-md-6 text-md-end"><p><strong>Reference #:</strong> ${order.reference}</p><p><strong>Invoice Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p></div></div><div class="table-responsive mt-3"><table class="table table-sm"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${productsTableRows}</tbody><tfoot><tr><th colspan="3" class="text-end">Subtotal:</th><th class="text-nowrap">₱${(order.subtotal || 0).toFixed(2)}</th></tr></tfoot></table></div>`;

        if (currentUser.role === 'Accounting' || currentUser.role === 'Admin') {
            allElements.orderUpdateForm.action = `/orders/${order._id}/update`;
            allElements.editFormContainer.innerHTML = `<h5 class="mb-3">Update Order Details</h5><div class="mb-3"><label class="form-label">Sales Invoice Number</label><input type="text" name="salesInvoice" class="form-control" value="${order.salesInvoice || ''}"></div><div class="mb-3"><label class="form-label">Order Status</label><select name="status" class="form-select"><option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="Awaiting Approval" ${order.status === 'Awaiting Approval' ? 'selected' : ''}>Awaiting Approval</option><option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option><option value="Order Shipped" ${order.status === 'Order Shipped' ? 'selected' : ''}>Order Shipped</option><option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option><option value="Rejected" ${order.status === 'Rejected' ? 'selected' : ''}>Rejected</option><option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></div><div class="mb-3"><label class="form-label">Payment Status</label><select name="paymentStatus" class="form-select"><option value="Unpaid" ${order.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option><option value="Paid" ${order.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option></select></div><hr>`;
            allElements.modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button><button type="submit" form="orderUpdateForm" class="btn btn-primary">Save Changes</button>';
        } else {
            allElements.modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
        }

        if (order.attachment) {
            allElements.attachmentSection.innerHTML = `<a href="${order.attachment}" target="_blank"><img src="${order.attachment}" class="img-fluid rounded" style="max-height: 150px;" alt="Attachment Preview"></a>`;
        } else {
            allElements.attachmentSection.innerHTML = `<p class="text-muted">No attachment found.</p>`;
        }
        
        messages.forEach(msg => appendMessage(msg, currentUser._id));
        socket.emit('joinOrderRoom', order._id);

        allElements.chatSearchInput.value = '';
        allElements.chatSearchInput.onkeyup = () => {
            const searchTerm = allElements.chatSearchInput.value.toLowerCase();
            allElements.chatBox.querySelectorAll('.chat-message').forEach(msgEl => {
                msgEl.style.display = msgEl.textContent.toLowerCase().includes(searchTerm) ? 'flex' : 'none';
            });
        };
        
        const handleSendMessage = async () => {
            let attachmentUrl = null;
            if (attachedFile) {
                const formData = new FormData();
                formData.append('attachment', attachedFile);
                try {
                    const response = await fetch(`/orders/${currentOrderId}/messages/attach`, { method: 'POST', body: formData });
                    const result = await response.json();
                    if (result.success) { attachmentUrl = result.url; } 
                    else { throw new Error('File upload failed'); }
                } catch (error) {
                    console.error('Attachment upload error:', error);
                    alert('Could not upload the file.');
                    return;
                }
            }
            const text = allElements.messageInput.value.trim();
            if (text || attachmentUrl) {
                socket.emit('sendOrderMessage', { orderId: currentOrderId, userId: currentUser._id, text: text, attachment: attachmentUrl });
                allElements.messageInput.value = '';
                attachedFile = null;
                allElements.fileInput.value = '';
                allElements.attachmentPreview.style.display = 'none';
                allElements.attachmentPreview.innerHTML = '';
            }
        };

        allElements.sendMessageBtn.onclick = handleSendMessage;
        allElements.messageInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
        allElements.attachBtn.onclick = () => allElements.fileInput.click();
        allElements.fileInput.onchange = () => {
            if (allElements.fileInput.files.length > 0) {
                attachedFile = allElements.fileInput.files[0];
                if (attachedFile.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => { allElements.attachmentPreview.innerHTML = `<span><img src="${e.target.result}" style="width: 30px; height: 30px; object-fit: cover; margin-right: 5px;"> ${attachedFile.name}</span> <button type="button" class="btn-close btn-sm"></button>`; };
                    reader.readAsDataURL(attachedFile);
                } else {
                    allElements.attachmentPreview.innerHTML = `<span>📄 ${attachedFile.name}</span> <button type="button" class="btn-close btn-sm"></button>`;
                }
                allElements.attachmentPreview.style.display = 'flex';
            }
        };
        allElements.attachmentPreview.onclick = (e) => {
            if (e.target.classList.contains('btn-close')) {
                attachedFile = null;
                allElements.fileInput.value = '';
                allElements.attachmentPreview.style.display = 'none';
            }
        };
    });

    document.body.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-order-btn');
        if (viewButton) { viewOrder(viewButton.dataset.orderId); }
    });

    socket.on('newOrderMessage', (msg) => {
        if (msg.order === currentOrderId) { appendMessage(msg, document.body.dataset.userId); }
    });
});