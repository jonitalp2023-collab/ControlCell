import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://yywrzzhanrwuloschbqf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_i8Jl-AR0Qx9pGwpyigd7Rw_PbPy9OrZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const state = { user:null, sales:[], customers:[], devices:[], installments:[], payments:[] };
const money = value => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(value)||0);
const dateText = value => value ? new Date(value+"T12:00:00").toLocaleDateString("es-AR") : "—";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function showLogin(message=""){ $("login-screen").classList.remove("hidden"); $("app-shell").classList.add("hidden"); $("login-error").textContent=message; }
function showApp(){ $("login-screen").classList.add("hidden"); $("app-shell").classList.remove("hidden"); $("admin-email").textContent=state.user?.email||"Administrador"; }
function friendlyError(error){
 const message=error?.message||"Ocurrió un error inesperado.";
 if(/Invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos. Revisá los datos e intentá nuevamente.";
 if(/Email not confirmed/i.test(message)) return "La cuenta todavía necesita confirmar el correo desde el mensaje de Supabase.";
 if(/Failed to fetch/i.test(message)) return "No se pudo conectar. Revisá tu conexión a internet.";
 return message;
}
$("login-form").addEventListener("submit",async event=>{
 event.preventDefault(); const form=new FormData(event.currentTarget); const button=$("login-submit");
 button.disabled=true; button.textContent="Ingresando…"; $("login-error").textContent="";
 const {data,error}=await supabase.auth.signInWithPassword({email:String(form.get("email")).trim(),password:String(form.get("password"))});
 button.disabled=false; button.textContent="Ingresar";
 if(error) return showLogin(friendlyError(error));
 state.user=data.user; showApp(); await loadData();
});
$("logout-button").addEventListener("click",async()=>{ await supabase.auth.signOut(); state.user=null; showLogin(); });
async function loadData(){
 if(!state.user) return;
 const tables=["customers","devices","sales","installments","payments"];
 const results=await Promise.all(tables.map(table=>supabase.from(table).select("*")));
 const failed=results.find(result=>result.error);
 if(failed){ alert("No se pudieron cargar los datos: "+friendlyError(failed.error)); return; }
 [state.customers,state.devices,state.sales,state.installments,state.payments]=results.map(result=>result.data||[]);
 render();
}
function navigate(view){
 document.querySelectorAll(".view").forEach(section=>section.classList.toggle("hidden",section.id!==view+"-view"));
 document.querySelectorAll(".nav-link").forEach(link=>link.classList.toggle("active",link.dataset.view===view));
 $("page-title").textContent=({dashboard:"Resumen",devices:"Equipos y ventas",customers:"Clientes",payments:"Cuotas y pagos"})[view]||"Resumen";
 if(location.hash!=="#"+view) history.replaceState(null,"","#"+view);
}
function render(){
 const customersById=new Map(state.customers.map(item=>[item.id,item]));
 const devicesById=new Map(state.devices.map(item=>[item.id,item]));
 const installmentsBySale=new Map();
 state.installments.forEach(item=>{ if(!installmentsBySale.has(item.sale_id)) installmentsBySale.set(item.sale_id,[]); installmentsBySale.get(item.sale_id).push(item); });
 const customerCounts=new Map();
 state.sales.forEach(sale=>customerCounts.set(sale.customer_id,(customerCounts.get(sale.customer_id)||0)+1));
 const pending=state.installments.filter(item=>item.status!=="paid").reduce((sum,item)=>sum+Number(item.amount),0);
 const collected=state.payments.reduce((sum,item)=>sum+Number(item.amount),0)+state.sales.reduce((sum,item)=>sum+Number(item.down_payment||0),0);
 $("stat-devices").textContent=state.sales.length;
 $("stat-customers").textContent=new Set(state.sales.map(item=>item.customer_id)).size;
 $("stat-pending").textContent=money(pending); $("stat-collected").textContent=money(collected);
 const salesNewest=[...state.sales].sort((a,b)=>b.sale_date.localeCompare(a.sale_date));
 $("recent-sales").innerHTML=salesNewest.length?tableRows(salesNewest.slice(0,5),false,customersById,devicesById,installmentsBySale):'<span class="empty-icon">▤</span><strong>Todavía no hay ventas</strong><p>Cuando registres una venta, aparecerá acá.</p><button class="button button-secondary" id="empty-new-sale">Registrar primera venta</button>';
 $("devices-table").innerHTML=tableRows(filteredSales($("device-search").value),true,customersById,devicesById,installmentsBySale);
 $("devices-empty").classList.toggle("hidden",state.sales.length>0);
 $("customers-table").innerHTML=[...customersById.values()].filter(c=>(c.full_name+" "+(c.phone||"")).toLowerCase().includes($("customer-search").value.toLowerCase())).map(c=>"<tr><td>"+escapeHtml(c.full_name)+"</td><td>"+escapeHtml(c.phone||"—")+"</td><td>"+(customerCounts.get(c.id)||0)+"</td></tr>").join("");
 $("customers-empty").classList.toggle("hidden",state.customers.length>0);
 const paymentRows=state.installments.slice().sort((a,b)=>a.due_date.localeCompare(b.due_date)).map(due=>{
  const sale=state.sales.find(item=>item.id===due.sale_id); if(!sale) return "";
  const customer=customersById.get(sale.customer_id), device=devicesById.get(sale.device_id);
  const status=due.status==="paid"?"Pagada":(due.status==="overdue"||due.due_date<new Date().toISOString().slice(0,10)?"Vencida":"Pendiente");
  return "<tr><td>"+escapeHtml(customer?.full_name||"—")+"</td><td>"+escapeHtml((device?.brand||"")+" "+(device?.model||""))+"</td><td>"+due.installment_number+" · "+money(due.amount)+"</td><td>"+dateText(due.due_date)+"</td><td><span class=\"pill "+(due.status==="paid"?"paid":"")+"\">"+status+"</span></td><td>"+(due.status==="paid"?"":'<button class="table-action" data-pay="'+due.id+'">Registrar pago</button>')+"</td></tr>";
 }).join("");
 $("payments-table").innerHTML=paymentRows; $("payments-empty").classList.toggle("hidden",state.installments.length>0);
}
function tableRows(sales,withBalance,customersById,devicesById,installmentsBySale){
 return sales.map(sale=>{
  const customer=customersById.get(sale.customer_id), device=devicesById.get(sale.device_id);
  const dues=installmentsBySale.get(sale.id)||[];
  const balance=dues.filter(item=>item.status!=="paid").reduce((sum,item)=>sum+Number(item.amount),0);
  return "<tr><td>"+escapeHtml(customer?.full_name||"—")+"</td><td>"+escapeHtml((device?.brand||"")+" "+(device?.model||""))+"</td><td>"+dateText(sale.sale_date)+"</td><td><span class=\"pill "+(balance===0?"paid":"")+"\">"+(balance===0?"Pagado":"En cuotas")+"</span></td>"+(withBalance?"<td>"+money(balance)+"</td>":"")+"</tr>";
 }).join("");
}
function filteredSales(query){
 const q=query.toLowerCase();
 return state.sales.filter(sale=>{
  const customer=state.customers.find(item=>item.id===sale.customer_id), device=state.devices.find(item=>item.id===sale.device_id);
  return ((customer?.full_name||"")+" "+(device?.brand||"")+" "+(device?.model||"")).toLowerCase().includes(q);
 });
}
function openDialog(){
 $("form-error").textContent=""; $("sale-form").reset();
 $("sale-form").elements.firstDue.value=new Date(Date.now()+86400000*30).toISOString().slice(0,10);
 $("sale-dialog").showModal();
}
function addMonths(dateString,months){
 const date=new Date(dateString+"T12:00:00"), day=date.getDate(); date.setDate(1); date.setMonth(date.getMonth()+months);
 const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate(); date.setDate(Math.min(day,lastDay)); return date.toISOString().slice(0,10);
}
$("sale-form").addEventListener("submit",async event=>{
 event.preventDefault(); if(!state.user) return;
 const form=new FormData(event.currentTarget), total=Number(form.get("total")), deposit=Number(form.get("deposit")), count=Number(form.get("installments"));
 if(!Number.isFinite(total)||!Number.isFinite(deposit)||deposit>total||total<=0||count<1||count>48||!form.get("firstDue")){ $("form-error").textContent="Revisá los importes, la fecha y la cantidad de cuotas."; return; }
 const button=$("save-sale-button"); button.disabled=true; button.textContent="Guardando…"; const owner_id=state.user.id;
 try{
  const customerResult=await supabase.from("customers").insert({owner_id,full_name:String(form.get("customer")).trim(),phone:String(form.get("phone")).trim()||null}).select("id").single();
  if(customerResult.error) throw customerResult.error;
  const deviceResult=await supabase.from("devices").insert({owner_id,brand:form.get("brand"),model:String(form.get("model")).trim()}).select("id").single();
  if(deviceResult.error) throw deviceResult.error;
  const saleResult=await supabase.from("sales").insert({owner_id,customer_id:customerResult.data.id,device_id:deviceResult.data.id,sale_date:new Date().toISOString().slice(0,10),currency:"ARS",total_price:total,down_payment:deposit,installment_count:count}).select("id").single();
  if(saleResult.error) throw saleResult.error;
  const balance=Math.round((total-deposit)*100)/100;
  if(balance>0){
   const base=Math.floor(balance/count*100)/100;
   const rows=Array.from({length:count},(_,i)=>({owner_id,sale_id:saleResult.data.id,installment_number:i+1,due_date:addMonths(String(form.get("firstDue")),i),amount:i===count-1?Math.round((balance-base*(count-1))*100)/100:base,status:"pending"}));
   const installmentResult=await supabase.from("installments").insert(rows); if(installmentResult.error) throw installmentResult.error;
  }
  $("sale-dialog").close(); await loadData(); navigate("devices");
 }catch(error){ $("form-error").textContent="No se pudo completar la venta: "+friendlyError(error)+" Si se guardó parcialmente, avisame antes de volver a cargarla."; }
 finally{ button.disabled=false; button.textContent="Guardar venta"; }
});
document.addEventListener("click",async event=>{
 const nav=event.target.closest("[data-view]"); if(nav){event.preventDefault();navigate(nav.dataset.view);}
 const go=event.target.closest("[data-go]"); if(go) navigate(go.dataset.go);
 if(event.target.closest("#new-sale-button, #devices-new-sale, #customers-new-sale, #empty-new-sale")) openDialog();
 const pay=event.target.closest("[data-pay]");
 if(pay){
  const installment=state.installments.find(item=>item.id===pay.dataset.pay);
  if(!installment||!confirm("¿Confirmás que recibiste "+money(installment.amount)+" de esta cuota?")) return;
  pay.disabled=true;
  const paymentResult=await supabase.from("payments").insert({owner_id:state.user.id,installment_id:installment.id,amount:installment.amount,method:"other"});
  if(paymentResult.error){alert("No se pudo registrar el pago: "+friendlyError(paymentResult.error));pay.disabled=false;return;}
  const updateResult=await supabase.from("installments").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",installment.id);
  if(updateResult.error) alert("El pago quedó registrado, pero no se pudo actualizar el estado de la cuota. Contactá soporte antes de volver a registrarlo.");
  await loadData();
 }
});
$("close-dialog").addEventListener("click",()=>$("sale-dialog").close());
$("cancel-dialog").addEventListener("click",()=>$("sale-dialog").close());
$("device-search").addEventListener("input",render);
$("customer-search").addEventListener("input",render);
supabase.auth.onAuthStateChange((_event,session)=>{
 if(session?.user){state.user=session.user;showApp();}else{state.user=null;showLogin();}
});
const {data:{session}}=await supabase.auth.getSession();
if(session?.user){state.user=session.user;showApp();await loadData();}else showLogin();
const initial=location.hash.replace("#","");
navigate(["devices","customers","payments"].includes(initial)?initial:"dashboard");
