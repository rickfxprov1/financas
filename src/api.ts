const j = (r: Response) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };

export const api = {
  list:     (filter: string = '') => fetch(`/api/transactions${filter}`).then(j),
  create:   (tx: any) => fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  update:   (id: number, tx: any) => fetch(`/api/transactions/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  remove:   (id: number) => fetch(`/api/transactions/${id}`, { method:'DELETE' }).then(j),
  dashboard:(filter: string = '') => fetch(`/api/dashboard${filter}`).then(j),
  categories:() => fetch('/api/categories').then(j),
  setBudget:(data: any) => fetch('/api/budgets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(j),
  importCSV:(csvData: string) => fetch('/api/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ csvData }) }).then(j),
};