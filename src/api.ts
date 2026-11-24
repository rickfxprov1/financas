const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
};

export const api = {
  list:     (filter: string = '') => fetch(`/api/transactions${filter}`).then(handleResponse),
  create:   (tx: any) => fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) }).then(handleResponse),
  update:   (id: number, tx: any) => fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) }).then(handleResponse),
  setPaid:  (id: number, paid: boolean) => fetch(`/api/transactions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid }) }).then(handleResponse),
  remove:   (id: number) => fetch(`/api/transactions/${id}`, { method: 'DELETE' }).then(handleResponse),
  dashboard:(filter: string = '') => fetch(`/api/dashboard${filter}`).then(handleResponse),
  categories:() => fetch('/api/categories').then(handleResponse),
  accounts: () => fetch('/api/accounts').then(handleResponse),
  setBudget:(data: any) => fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  importCSV:(csvData: string, account_id: number) => fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvData, account_id }) }).then(handleResponse),
};