let locks = 0,
  previous = "";
export function lockBodyScroll() {
  if (locks === 0) {
    previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0) document.body.style.overflow = previous;
  };
}
