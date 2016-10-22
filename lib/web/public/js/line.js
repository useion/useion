window.line = {};

window.line.updateLine = function (ll) {
  var src = $(ll.data('src')),
      dst = $(ll.data('dst'));

  if (src.length &&
      dst.length &&
      src.is(":visible") &&
      dst.is(":visible") &&
      utils.isElementInViewport(src) &&
      utils.isElementInViewport(dst)) {
    ll.show();
    window.line.drawLine(src, dst, ll);
  } else {
    ll.hide();
  }
}

window.line.drawLine = function (src, dst, ll) {

  if (!ll)
    ll = $('<div class="link-line"></div>').appendTo('body');

  var top = src.offset().top + src.outerHeight() / 2,
      left = src.offset().left + src.outerWidth() / 2,
      originX = src.offset().left + src.outerWidth() / 2,
      originY = src.offset().top + src.outerHeight() / 2,
      dstX = dst.offset().left + dst.outerWidth() / 2,
      dstY = dst.offset().top + dst.outerHeight() / 2 ,
      length = Math.sqrt((dstX - originX) * (dstX - originX)
          + (dstY - originY) * (dstY - originY)),
      angle = 180 / 3.1415 * Math.acos((dstY - originY) / length);

  if (dstX > originX)
      angle *= -1;

  ll
          .data('src', src.getPath())
          .data('dst', dst.getPath())
          .css('top', top)
          .css('left', left)
          .css('height', length)
          .css('-webkit-transform', 'rotate(' + angle + 'deg)')
          .css('-moz-transform', 'rotate(' + angle + 'deg)')
          .css('-o-transform', 'rotate(' + angle + 'deg)')
          .css('-ms-transform', 'rotate(' + angle + 'deg)')
          .css('transform', 'rotate(' + angle + 'deg)');

  return ll;
}
