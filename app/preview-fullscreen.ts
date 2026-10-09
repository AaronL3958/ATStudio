/** Browsers can omit the API, reject it, or resolve without entering fullscreen. */
export async function tryPreviewFullscreen(element: HTMLElement, doc: Document): Promise<boolean> {
  if (typeof element.requestFullscreen !== 'function' || doc.fullscreenEnabled === false) return false;
  try {
    await element.requestFullscreen({navigationUI:'hide'});
    return doc.fullscreenElement === element;
  } catch {
    return false;
  }
}
