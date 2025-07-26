document.addEventListener('DOMContentLoaded', () => {
    const orderDetailModalEl = document.getElementById('orderDetailModal');
    if (!orderDetailModalEl) return;

    const socket = io();
    let currentOrderId = null;
    const orderDetailModal = new bootstrap.Modal(orderDetailModalEl);

    async function viewOrder(orderId) {
        try {
            const mainContentContainer = document.getElementById('main_content_container');
            if (mainContentContainer) mainContentContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
            
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            
            const data = await response.json();
            orderDetailModalEl.dataset.orderData = JSON.stringify(data);
            orderDetailModal.show();
        } catch (error) {
            console.error("Failed to fetch order data:", error);
            alert('Could not load order details. Please check the console.');
        }
    }

    function appendMessage(msg, currentUserId) {
        const chatBox = document.getElementById('modal_chatMessages');
        if (!chatBox || !msg.sender) return;

        let attachmentHTML = '';
        if (msg.attachment) {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment)) {
                attachmentHTML = `<a href="${msg.attachment}" target="_blank"><img src="${msg.attachment}" class="chat-attachment-img"></a>`;
            } else {
                const filename = msg.attachment.split('/').pop();
                attachmentHTML = `<a href="${msg.attachment}" target="_blank" class="chat-attachment-file">📄 ${filename}</a>`;
            }
        }

        const isSent = msg.sender._id === currentUserId;
        const messageClass = isSent ? 'chat-message-sent' : 'chat-message-received';
        const profilePic = msg.sender.profilePicture || '/images/default-profile.png';
        const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userName = msg.sender.firstName || 'User';

        const messageHTML = `
            <div class="chat-message ${messageClass}">
                <img src="${profilePic}" class="chat-profile-pic">
                <div class="chat-bubble">
                    <div class="username">${userName}</div>
                    ${msg.text ? `<div class="chat-text">${msg.text}</div>` : ''}
                    ${attachmentHTML}
                    <div class="timestamp">${timestamp}</div>
                </div>
            </div>`;
        chatBox.innerHTML += messageHTML;
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    orderDetailModalEl.addEventListener('shown.bs.modal', function (event) {
        const data = JSON.parse(event.currentTarget.dataset.orderData || '{}');
        if (!data.order) return;

        const { order, currentUser } = data;
        const messages = order.messages || [];
        currentOrderId = order._id;

        const mainContentContainer = document.getElementById('main_content_container');
        const modalFooter = document.getElementById('modal_footer');
        
        document.getElementById('modal_customerName_header').innerText = `Order for ${order.customerName}`;
        
        let productsTableRows = '';
        (order.products || []).forEach(p => {
            productsTableRows += `<tr><td>${p.product || 'N/A'}</td><td>${p.quantity || 0}</td><td>${p.unit || 'N/A'}</td><td>₱${(p.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td><td>₱${(p.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>`;
        });

        let editFormHTML = '';
         if (currentUser.role === 'Accounting' || currentUser.role === 'Admin') {
            editFormHTML = `
                <div class="card mt-3"><div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="card-title mb-0">Update Order Status</h6>
                        <button type="button" id="toggle-edit-btn" class="btn btn-outline-secondary btn-sm">Edit</button>
                    </div>
                    <fieldset id="order-edit-fieldset" disabled>
                        <div class="mb-3"><label class="form-label">Sales Invoice Number</label><input type="text" name="salesInvoice" class="form-control" value="${order.salesInvoice || ''}"></div>
                        <div class="mb-3"><label class="form-label">Order Status</label><select name="status" class="form-select"><option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="Awaiting Approval" ${order.status === 'Awaiting Approval' ? 'selected' : ''}>Awaiting Approval</option><option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option><option value="Order Shipped" ${order.status === 'Order Shipped' ? 'selected' : ''}>Order Shipped</option><option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option><option value="Rejected" ${order.status === 'Rejected' ? 'selected' : ''}>Rejected</option><option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></div>
                        <div class="mb-3"><label class="form-label">Payment Status</label><select name="paymentStatus" class="form-select"><option value="Unpaid" ${order.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option><option value="Paid" ${order.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option></select></div>
                    </fieldset>
                </div></div>
            `;
         }

        mainContentContainer.innerHTML = `
            <div class="row align-items-start">
                <div class="col-lg-7">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="card"><div class="card-body">
                                <h6 class="card-title mb-3">Customer & Order Info</h6>
                                <p class="mb-1"><strong>Sales Rep:</strong> ${order.user ? order.user.firstName + ' ' + order.user.lastName : 'N/A'}</p>
                                <p class="mb-1"><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                                <p class="mb-1"><strong>Hospital/Clinic:</strong> ${order.hospital || 'N/A'}</p>
                                <p class="mb-1"><strong>Area:</strong> ${order.area || 'N/A'}</p>
                                <p class="mb-1"><strong>Contact:</strong> ${order.contactNumber || 'N/A'}</p>
                                <p class="mb-1"><strong>Email:</strong> ${order.email || 'N/A'}</p>
                            </div></div>
                        </div>
                        <div class="col-md-6">
                            <div class="card"><div class="card-body">
                                <h6 class="card-title mb-3">Invoice Details</h6>
                                <p class="mb-1"><strong>Reference #:</strong> ${order.reference}</p>
                                <p class="mb-1"><strong>Invoice Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                                <p class="mb-1"><strong>Sales Invoice #:</strong> ${order.salesInvoice || 'N/A'}</p>
                            </div></div>
                        </div>
                    </div>
                    <div class="card mt-3"><div class="card-body">
                        <h6 class="card-title mb-3">Ordered Products</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered mb-0">
                                <thead class="table-light"><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr></thead>
                                <tbody>${productsTableRows}</tbody>
                                <tfoot><tr><th colspan="4" class="text-end">Subtotal:</th><th class="text-nowrap">₱${(order.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</th></tr></tfoot>
                            </table>
                        </div>
                    </div></div>
                    <div class="card mt-3"><div class="card-body">
                        <h6 class="card-title">Attachments</h6>
                        <div id="attachment_section_content"></div>
                    </div></div>
                    ${order.note ? `<div class="card mt-3"><div class="card-body"><h6 class="card-title">Notes:</h6><p class="mb-0">${order.note}</p></div></div>` : ''}
                    <div id="order_edit_form_container">${editFormHTML}</div>
                </div>

                <div class="col-lg-5 mt-4 mt-lg-0">
                    <div class="chat-container">
                        <h5 class="mb-3">Communication</h5>
                        <div id="modal_chatMessages" class="chat-messages"></div>
                        <div class="chat-input-area mt-auto">
                            <div id="chat_attachment_preview" class="mb-2" style="display: none; align-items: center; gap: 10px;"></div>
                            <div class="d-flex">
                                <input type="file" id="chat_file_input" style="display: none;" name="attachment">
                                <button id="chat_attach_btn" class="btn btn-light border" type="button" title="Attach file">📎</button>
                                <input type="text" id="modal_messageText" class="form-control" placeholder="Type a comment...">
                                <button id="modal_sendMessageBtn" class="btn btn-primary" type="button">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const attachmentSectionContent = document.getElementById('attachment_section_content');
        if (order.attachment) {
            attachmentSectionContent.innerHTML = `<a href="${order.attachment}" target="_blank"><img src="${order.attachment}" class="img-fluid rounded border" style="max-height: 200px;" alt="Attachment Preview"></a>`;
        } else {
            attachmentSectionContent.innerHTML = `<p class="text-muted">No attachment provided.</p>`;
        }

        modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
        const orderUpdateForm = document.getElementById('orderUpdateForm');
        if (document.getElementById('toggle-edit-btn')) {
            const editBtn = document.getElementById('toggle-edit-btn');
            const fieldset = document.getElementById('order-edit-fieldset');
            orderUpdateForm.action = `/orders/${order._id}/update`;
            editBtn.addEventListener('click', () => {
                if (fieldset.disabled) {
                    fieldset.disabled = false;
                    editBtn.textContent = 'Cancel';
                    editBtn.classList.replace('btn-outline-secondary', 'btn-outline-danger');
                    modalFooter.innerHTML = '<button type="button" class="btn btn-primary" form="orderUpdateForm" type="submit">Save Changes</button>';
                } else {
                    fieldset.disabled = true;
                    editBtn.textContent = 'Edit';
                    editBtn.classList.replace('btn-outline-danger', 'btn-outline-secondary');
                    modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
                }
            });
        }
        
        const chatBox = document.getElementById('modal_chatMessages');
        const messageInput = document.getElementById('modal_messageText');
        const sendMessageBtn = document.getElementById('modal_sendMessageBtn');
        const attachBtn = document.getElementById('chat_attach_btn');
        const fileInput = document.getElementById('chat_file_input');
        const attachmentPreview = document.getElementById('chat_attachment_preview');
        
        chatBox.innerHTML = '';
        messages.forEach(msg => appendMessage(msg, currentUser._id));
        socket.emit('joinOrderRoom', order._id);
        
        const handleSendMessage = async () => {
            const text = messageInput.value.trim();
            const file = fileInput.files[0];
            if (!text && !file) return;

            const formData = new FormData();
            formData.append('text', text);
            if (file) formData.append('attachment', file);

            try {
                const response = await fetch(`/orders/${currentOrderId}/messages`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!result.success) throw new Error(result.message || 'Server error');
            } catch (error) {
                console.error('Failed to send message:', error);
                alert('Could not send message.');
            } finally {
                messageInput.value = '';
                fileInput.value = null;
                attachmentPreview.style.display = 'none';
                attachmentPreview.innerHTML = '';
            }
        };

        sendMessageBtn.onclick = handleSendMessage;
        messageInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
        attachBtn.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                attachmentPreview.innerHTML = `<span>📎 ${file.name}</span> <button type="button" class="btn-close btn-sm"></button>`;
                attachmentPreview.style.display = 'flex';
            }
        };
        attachmentPreview.onclick = (e) => {
            if (e.target.classList.contains('btn-close')) {
                fileInput.value = null;
                attachmentPreview.style.display = 'none';
            }
        };
    });

    document.body.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-order-btn');
        if (viewButton) {
            const orderId = viewButton.dataset.orderId;
            if (orderId) viewOrder(orderId);
        }
    });
 
    socket.on('newOrderMessage', (msg) => {
        if (msg.order === currentOrderId) {
            appendMessage(msg, document.body.dataset.userId);
        }
    });

    socket.on('newDailyPlan', (plan) => {
        const tableBody = document.querySelector('#dailyPlanTable tbody');
        if (tableBody) {
            const newRow = document.createElement('tr');
            newRow.className = 'is-new';
            newRow.dataset.planId = plan._id;
            newRow.innerHTML = `
                <td>${plan.user.firstName} ${plan.user.lastName}</td>
                <td>${new Date(plan.planDate).toLocaleDateString()}</td>
                <td>${plan.firstClientCall || ''}</td>
                <td><a href="/planning/view/daily/${plan._id}" class="btn btn-sm btn-primary view-details-link">View Details</a></td>
            `;
            tableBody.prepend(newRow);
        }
    });

    document.body.addEventListener('click', async (event) => {
        const link = event.target.closest('.view-details-link');
        const row = link ? link.closest('tr') : null;
        if (row && row.classList.contains('is-new')) {
            const planId = row.dataset.planId;
            if (!planId) return;
            try {
                await fetch(`/planning/view/daily/${planId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                row.classList.remove('is-new');
            } catch (error) {
                console.error('Failed to mark plan as read:', error);
            }
        }
    });
});