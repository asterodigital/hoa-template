export const imageModal = () => {
  const imageModal = document.getElementById('imageModal')
  const modalImage = document.getElementById('modalImage')

  if (!imageModal || !modalImage) {
    return
  }

  imageModal.addEventListener('show.bs.modal', function (event) {
    const trigger = event.relatedTarget
    const imgSrc = trigger.getAttribute('data-img-src')
    modalImage.src = imgSrc
  })
}
