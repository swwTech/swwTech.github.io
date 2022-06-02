
export const STORAGE_KEY = 'user_auth_xxxxxxxxxxxx'

// Do user authorization verify
export function checkAuth () 
{
  var auth = JSON.parse(localStorage.getItem(STORAGE_KEY))
  return auth && Object.keys(auth).length
}
