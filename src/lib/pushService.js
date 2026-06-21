// ============================================================
// pushService.js — Web Push Notifications helpers
// ============================================================

/**
 * Convierte una clave VAPID Base64 URL-safe a Uint8Array
 * (requerido por PushManager.subscribe)
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Detecta si el dispositivo es iOS
 */
export function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Detecta si la app está corriendo como PWA instalada (standalone)
 */
export function esPWAInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Retorna el estado actual del permiso de notificaciones
 * @returns {'granted'|'denied'|'default'|'no-supported'}
 */
export function getEstadoPermiso() {
  if (!('Notification' in window)) return 'no-supported'
  return Notification.permission
}

/**
 * Solicita permiso y suscribe al push manager.
 * Guarda la suscripción en Supabase.
 * @param {string} userId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {{ ok: boolean, error?: string }}
 */
export async function suscribirPush(userId, supabaseClient) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, error: 'Push no soportado en este dispositivo.' }
    }

    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') {
      return { ok: false, error: 'Permiso de notificaciones denegado.' }
    }

    const registration = await navigator.serviceWorker.ready

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      return { ok: false, error: 'VITE_VAPID_PUBLIC_KEY no configurada.' }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const subJSON = subscription.toJSON()

    const deviceInfo = `${navigator.userAgent.slice(0, 200)}`

    const { error } = await supabaseClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
          device_info: deviceInfo,
        },
        { onConflict: 'endpoint' }
      )

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message || 'Error desconocido al suscribir push.' }
  }
}

/**
 * Cancela la suscripción push actual y la elimina de Supabase.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {{ ok: boolean, error?: string }}
 */
export async function cancelarPush(supabaseClient) {
  try {
    if (!('serviceWorker' in navigator)) {
      return { ok: false, error: 'Service Worker no soportado.' }
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return { ok: true } // ya estaba cancelado

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    await supabaseClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message || 'Error al cancelar push.' }
  }
}
