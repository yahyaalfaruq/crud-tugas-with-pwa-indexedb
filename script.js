const DB_NAME = 'MyDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'MyStore';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function addData(data) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.add(data);
  return transactionComplete(transaction);
}

async function getAllData() {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteData(id) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  return transactionComplete(transaction);
}

async function updateData(updatedItem) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(updatedItem);
  return transactionComplete(transaction);
}

// --- DOM Elements ---
const taskForm = document.getElementById('taskForm');
const titleInput = document.getElementById('titleInput');
const descriptionInput = document.getElementById('descriptionInput');
const dueDateInput = document.getElementById('dueDateInput');
const statusInput = document.getElementById('statusInput');
const submitButton = document.getElementById('submitButton');
const cancelButton = document.getElementById('cancelButton');

const taskList = document.getElementById('taskList');

const modalOverlay = document.getElementById('modalOverlay');
const modalText = document.getElementById('modalText');
const modalDeleteButton = document.getElementById('modalDeleteButton');
const modalCancelButton = document.getElementById('modalCancelButton');

let editingId = null; // Menyimpan id tugas yang sedang diedit
let deletingId = null; // Menyimpan id tugas yang sedang akan dihapus

// Render semua data ke list
async function renderList() {
  const data = await getAllData();
  taskList.innerHTML = '';

  data.forEach(item => {
    const li = document.createElement('li');
    li.className = 'listItem';

    li.innerHTML = `
      <div class="taskInfo">
        <strong>${item.title}</strong><br />
        <small>${item.description || '-'}</small><br />
        <small>Deadline: ${item.dueDate || '-'}</small><br />
        <small>Status: ${item.status}</small>
      </div>
      <div class="actions">
        <button class="editButton" data-id="${item.id}"><i class="ri-edit-2-line"></i> Edit</button>
        <button class="deleteButton" data-id="${item.id}"><i class="ri-delete-bin-5-line"></i> Delete</button>
      </div>
    `;

    taskList.appendChild(li);
  });

  // Attach event listener untuk edit dan delete button
  document.querySelectorAll('.editButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      startEdit(id);
    });
  });

  document.querySelectorAll('.deleteButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      startDelete(id);
    });
  });
}

// Start editing item
async function startEdit(id) {
  const data = await getAllData();
  const item = data.find(d => d.id === id);
  if (!item) return;

  editingId = id;

  titleInput.value = item.title;
  descriptionInput.value = item.description || '';
  dueDateInput.value = item.dueDate || '';
  statusInput.value = item.status || 'Belum mulai';

  submitButton.innerHTML = '<i class="ri-loop-right-line"></i> Update';
  cancelButton.style.display = 'inline-block';
}

// Cancel edit
function cancelEdit() {
  editingId = null;
  taskForm.reset();
  submitButton.textContent = 'Tambah';
  cancelButton.style.display = 'none';
}

// Start delete confirmation modal
async function startDelete(id) {
  const data = await getAllData();
  const item = data.find(d => d.id === id);
  if (!item) return;

  deletingId = id;
  modalText.textContent = `Yakin ingin menghapus tugas "${item.title}"?`;
  modalOverlay.style.display = 'flex';
}

// Cancel delete modal
function cancelDelete() {
  deletingId = null;
  modalOverlay.style.display = 'none';
}

// Handle form submit
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newData = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    dueDate: dueDateInput.value,
    status: statusInput.value
  };

  if (!newData.title) {
    alert('Judul tugas wajib diisi!');
    return;
  }

  if (editingId !== null) {
    // update data
    newData.id = editingId;
    await updateData(newData);
    editingId = null;
  } else {
    // add new data
    await addData(newData);
  }

  taskForm.reset();
  submitButton.textContent = 'Tambah';
  cancelButton.style.display = 'none';

  renderList();
});

// Cancel edit button
cancelButton.addEventListener('click', () => {
  cancelEdit();
});

// Modal buttons
modalCancelButton.addEventListener('click', () => {
  cancelDelete();
});

modalDeleteButton.addEventListener('click', async () => {
  if (deletingId !== null) {
    await deleteData(deletingId);
    deletingId = null;
    modalOverlay.style.display = 'none';
    renderList();
  }
});

// Initial render
renderList();
