(async function ($) {
  'use strict';

  let prev;
  let role = getRole();
  const viewport = $('meta[name="viewport"]');

  if(role && role === 'Master'){
    $('.notification-deck').hover(
      function () {
        let removeBtn = $(this).children()[0];
        $(removeBtn).velocity({ opacity: 1, display: 'block' },0);
      },
      function () {
        let removeBtn = $(this).children()[0];
        $(removeBtn).velocity({ opacity: 0, display: 'none' },0);
      }
    );
  }
  
  $('#notifications').on('click', '#removeAllNotifications', function (e) {
      
    let content = $('#nots');
    let removeBtn = $('#removeAllNotifications');
      
    let allContent = $('#nots, #removeAllNotifications');
  
    $.post('/notifications', { all: true }).always(function (
      data,
      textStatus,
      jqXHR
    ) {
      if (jqXHR.status === 200) {
        allContent.velocity({ opacity: 0, display: 'none' }, { duration: 500 }).then( function () {
  
          content.empty();
          content.velocity({ opacity: 1, display: 'block' });
          removeBtn.remove();
          
          $.snack('success', 'All Notifications removed!', 3000)
  
          if (!$('.mw-470').length)
            $('.nots-container').append(
              '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
            );
        });
      } else {
        console.log('Error');
        $.snack('error', 'An error occured!', 3000)
      }
    });
  });
    
  $('#notifications').on('click', function (e) {
      
    let target = $(e.target);
    let light = $(e.target).parents('.notification-deck');
    
    if(target.length && (target[0].className === 'notification-deck-remove' || target[0].className.includes('removeNotification') || target[0].className.includes('notification-deck-remove'))){
      
      e.preventDefault();
        
      if(light.length){
      
        let id = $(light).attr('data-target');
        $(light).attr('data-removed-manual', '1');
          
        $.post('/notifications', { id: id }).always(function (
          data,
          textStatus,
          jqXHR
        ) {
          if (jqXHR.status === 200) {
            $(light)
            .velocity({ opacity: 0, display: 'none' }, { duration: 500 })
            .then( function () {
              $(light).remove();
              
              $.snack('success', 'Notification ' + id + ' removed!', 3000)
  
              let notifications = $('#nots').children();
  
              if (!notifications.length) {
                $('#removeAllNotifications').remove();
                $('.nots-container').append(
                  '<img class="container d-flex justify-content-center mw-470" src="/images/web/no_notifications.png" alt="' + window.i18next.t('views.notifications.no_notifications') + '" />'
                );
              }
            });
          } else {
            console.log('Error');
            $.snack('error', 'An error occured!', 3000)
          }
        });
      
      }
      
    } else {
      
      if(light.length){
  
        let href = $(light).attr('href');
  
        lightcase.start({
          href: href,
          onStart: {
            bar: function(){
              viewport.attr("content", "width=device-width, initial-scale=1, viewport-fit=cover");
            }
          },
          onClose: {
            grault: function(){
              viewport.attr("content", "width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1, viewport-fit=cover");
            }
          }
        });
  
        e.preventDefault();
  
      }
    }
      
  });
    
  function myfunction(el, trgt, d) {
  
    if (d == 'left') {
      
      let target = trgt.parents('.notification-deck').children('.notification-deck-remove');
          
      if(prev)
        prev.velocity(
          {
            right: -100,
          },
          {
            duration: 500,
            easing: 'easeInOutCubic',
            queue: false
          }
        );
            
      prev = target;
          
      target.velocity(
        {
          right: 0,
        },
        {
          duration: 500,
          easing: 'easeInOutCubic',
          queue: false
        }
      );
        
    }
      
  }
  
  if(role && role === 'Master')
    detectswipe('#nots', myfunction);
    
  $(window).on('click', function(e){
  
    let target = $(e.target).parents('.notification-deck');
  
    if(!target.length && prev)
      prev.velocity(
        {
          right: -100,
        },
        {
          duration: 500,
          easing: 'easeInOutCubic',
          queue: false
        }
      );
  
  });

})(jQuery);