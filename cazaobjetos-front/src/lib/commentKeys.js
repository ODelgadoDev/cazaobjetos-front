export function sendCommentOnEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey ||
      event.nativeEvent.isComposing || event.keyCode === 229 ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  event.preventDefault()
  if (!event.repeat) event.currentTarget.form?.requestSubmit()
}
