const listeners = new Set();
let uid = 0;

function emit(type, message) {
  const id = ++uid;
  listeners.forEach(fn => fn({ id, type, message: String(message || '') }));
  return id;
}

export const toast = {
  success: msg => emit('success', msg),
  error:   msg => emit('error',   msg),
  info:    msg => emit('info',    msg),
  warning: msg => emit('warning', msg),
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
