const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function suscribirPush(userId, supabase) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) { console.warn('VITE_VAPID_PUBLIC_KEY no configurada'); return null }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const { endpoint, keys } = sub.toJSON()
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, keys, device_info: navigator.userAgent },
      { onConflict: 'endpoint' }
    )
    return sub
  } catch (err) {
    console.warn('Push subscription failed:', err)
    return null
  }
}

export async function cancelarPush(supabase) {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const { endpoint } = sub.toJSON()
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function enviarPush(userId, supabase, datos) {
  try {
    await supabase.functions.invoke('send-push', {
      body: { user_id: userId, ...datos }
    })
  } catch (err) {
    console.warn('Push send failed:', err)
  }
}

export function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

export function esPWAInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         !!window.navigator.standalone
}

export function getEstadoPermiso() {
  if (!('Notification' in window)) return 'no-supported'
  return Notification.permission
}
