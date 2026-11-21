(() => {
  const $ = (id) => document.getElementById(id);
  const state = { sales: [] };
  const money = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
  const dateText = (value) => value ? new Date(value + "T12:00:00").toLocaleDateString("es-AR") : "—";
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));

  function navigate(view) {
    document.querySelectorAll(".view").forEach((section) => section.classList.toggle("hidden", section.id !== view + "-view"));
    document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
    $("page-title").textContent = ({ dashboard:"Resumen", devices:"Equipos y ventas", customers:"Clientes", payments:"Cuotas y pagos" })[view] || "Resumen";
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
  }

  function render() {
    const customers = new Map();
    let pending = 0, collected = 0;
    state.sales.forEach((sale) => {
      const paidInstallments = sale.schedule.filter(due => due.paid).reduce((sum, due) => sum + due.amount, 0);
      const unpaidInstallments = sale.schedule.filter(due => !due.paid).reduce((sum, due) => sum + due.amount, 0);
      pending += unpaidInstallments;
      collected += sale.deposit + paidInstallments;
      customers.set(sale.customer.toLowerCase(), { name:sale.customer, phone:sale.phone, count:(customers.get(sale.customer.toLowerCase())?.count || 0) + 1 });
    });
    $("stat-devices").textContent = state.sales.length;
    $("stat-customers").textContent = customers.size;
    $("stat-pending").textContent = money(pending);
    $("stat-collected").textContent = money(collected);

    $("recent-sales").innerHTML = state.sales.length ? tableRows(state.sales.slice().reverse().slice(0,5), false) : '<span class="empty-icon">▤</span><strong>Todavía no hay ventas</strong><p>Cuando registres una venta, aparecerá acá.</p><button class="button button-secondary" id="empty-new-sale">Registrar primera venta</button>';
    $("devices-table").innerHTML = tableRows(filteredSales($("device-search").value), true);
    $("devices-empty").classList.toggle("hidden", state.sales.length > 0);
    $("customers-table").innerHTML = [...customers.values()].filter(c => (c.name + " " + (c.phone || "")).toLowerCase().includes($("customer-search").value.toLowerCase())).map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.phone || "—")}</td><td>${c.count}</td></tr>`).join("");
    $("customers-empty").classList.toggle("hidden", customers.size > 0);
    $("payments-table").innerHTML = state.sales.flatMap(sale => sale.schedule.map((due, index) => `<tr><td>${escapeHtml(sale.customer)}</td><td>${escapeHtml(sale.brand + " " + sale.model)}</td><td>${index+1}/${sale.schedule.length} · ${money(due.amount)}</td><td>${dateText(due.date)}</td><td><span class="pill ${due.paid ? "paid" : ""}">${due.paid ? "Pagada" : "Pendiente"}</span></td><td>${due.paid ? "" : `<button class="table-action" data-pay="${sale.id}:${index}">Registrar pago</button>`}</td></tr>`)).join("");
    $("payments-empty").classList.toggle("hidden", state.sales.length > 0);
    $("recent-sales").querySelector("#empty-new-sale")?.addEventListener("click", openDialog);
  }

  function tableRows(sales, withBalance) {
    return sales.map(sale => {
      const balance = sale.schedule.filter(due => !due.paid).reduce((sum, due) => sum + due.amount, 0);
      return `<tr><td>${escapeHtml(sale.customer)}</td><td>${escapeHtml(sale.brand + " " + sale.model)}</td><td>${dateText(sale.created)}</td><td><span class="pill ${balance === 0 ? "paid" : ""}">${balance === 0 ? "Pagado" : "En cuotas"}</span></td>${withBalance ? `<td>${money(balance)}</td>` : ""}</tr>`;
    }).join("");
  }
  function filteredSales(query) {
    const q = query.toLowerCase();
    return state.sales.filter(s => (s.customer + " " + s.brand + " " + s.model).toLowerCase().includes(q));
  }

  function openDialog() {
    $("form-error").textContent = "";
    $("sale-form").reset();
    $("sale-form").elements.firstDue.value = new Date(Date.now() + 86400000 * 30).toISOString().slice(0,10);
    $("sale-dialog").showModal();
  }

  function addMonths(dateString, months) {
    const date = new Date(dateString + "T12:00:00");
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
    return date.toISOString().slice(0,10);
  }

  $("sale-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const total = Number(form.get("total")), deposit = Number(form.get("deposit")), count = Number(form.get("installments"));
    if (!Number.isFinite(total) || !Number.isFinite(deposit) || deposit > total || total <= 0 || count < 1 || count > 48) {
      $("form-error").textContent = "Revisá los importes y la cantidad de cuotas.";
      return;
    }
    const balance = Math.round((total - deposit) * 100) / 100;
    const base = Math.floor(balance / count * 100) / 100;
    const schedule = Array.from({length:count}, (_, i) => ({ date:addMonths(form.get("firstDue"), i), amount:i === count - 1 ? Math.round((balance - base * (count - 1)) * 100) / 100 : base, paid:false }));
    state.sales.push({ id:crypto.randomUUID(), customer:String(form.get("customer")).trim(), phone:String(form.get("phone")).trim(), brand:form.get("brand"), model:String(form.get("model")).trim(), total, deposit, created:new Date().toISOString().slice(0,10), schedule });
    $("sale-dialog").close();
    render();
    navigate("devices");
  });

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-view]");
    if (nav) { event.preventDefault(); navigate(nav.dataset.view); }
    const go = event.target.closest("[data-go]");
    if (go) navigate(go.dataset.go);
    if (event.target.closest("#new-sale-button, #devices-new-sale, #customers-new-sale, #empty-new-sale")) openDialog();
    const pay = event.target.closest("[data-pay]");
    if (pay) {
      const [saleId, index] = pay.dataset.pay.split(":");
      const sale = state.sales.find(item => item.id === saleId);
      if (sale && confirm("¿Confirmás que recibiste esta cuota?")) { sale.schedule[Number(index)].paid = true; render(); }
    }
  });
  $("close-dialog").addEventListener("click", () => $("sale-dialog").close());
  $("cancel-dialog").addEventListener("click", () => $("sale-dialog").close());
  $("device-search").addEventListener("input", render);
  $("customer-search").addEventListener("input", render);
  document.querySelectorAll("[data-view]").forEach(link => link.addEventListener("click", () => navigate(link.dataset.view)));
  const initial = location.hash.replace("#", "");
  navigate(["devices","customers","payments"].includes(initial) ? initial : "dashboard");
  render();
})();