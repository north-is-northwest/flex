//$(function() { 
'use strict';

/*//======================================\\*\
                    events
*///======================================\\\*
$('#in').on('touchstart', function() {
    var time_in_hud = hhmm_to_unix($('#hud').val()),
        future_records = user.record.filter(function(record) { 
            return record.day > get_day(); 
        }).length;
    
    //clear records if there are records from days ahead (means it is a new week)
    if(future_records) clear_record();
    
    //toggle status
    user.active = !user.active;
    
    //new record
    user.record.push({
        'active': user.active,
        'day': get_day(),
        'timestamp': $.now(),
        'time': get_time()
    });
    
    draw_entries();
});

$(document)
.on('focus', '.entry input', function() {
    $(this).data().focus_time = $(this).val();
})
.on('blur', '.entry input', function() {
    var old_time = $(this).data().focus_time,
        set_time = $(this).val(),
        $entry = $(this).parent('.entry'),
        timestamp = +$entry.attr('data-timestamp'),
        entry_index = +$.map(user.record, function(record, index) {
           return record.timestamp === timestamp ? index : null;
        });

    if(set_time === '') {
        //delete entry and next entry (if it exists) to maintain sequence of play, pause, etc...
        user.record.splice(entry_index, !user.record[entry_index + 1] ? 1 : 2);
        //set status according to most recent entry if it exits
        user.active = !user.record.length ? false : latest_record().active;

    } else { //set time difference
        var set_timestamp = timestamp - (Date.parse('1970-04-20T' + old_time) - Date.parse('1970-04-20T' + set_time));
        //apply new time to entry
        user.record[entry_index].time = set_time;
        user.record[entry_index].timestamp = set_timestamp;
    }
    
    redraw();
});

//settings change
$('#settings button, #settings input').on('touchstart', function() {
    redraw();
});
//open settings - scroll down
$('input[name=settings]').on('click', function() {
    $('html, body').animate({ 
        scrollTop: $(document).height()-$(window).height()
    }, 250);
});
//variable (element's name) = value of checked radio button
$('#settings input[type=radio]').on('change', function() {
    var setting = $(this).prop('name'),
        value = $('[name=' + setting + ']:checked').val();
    user[setting] = isNaN(value) ? value : +value;
});
//object (element's name)'s keys are booleans set according to :checked
$('#settings input[type=checkbox]').on('change', function() {
    var setting = $(this).prop('name'),
        key = $(this).attr('data-key');
    user[setting][key] = $(this).is(':checked');
});
//variable (name) = value of set number
$('#settings input[type=number]').on('change', function() {
    var setting = $(this).prop('name');
    user[setting] = +$(this).val();
});

//reveal entry from past day
$(document).on('touchstart', 'section:not(.today):not(.active-day) h2', function() {
    var visibility = ['inline-block', 'none'][+($(this).parent().find('.entry').css('display') === 'inline-block')];
    
    $(this).parent().find('.entry').css('display', visibility);
});

//force clear record
$(document).on('touchstart', '#settings #clear', function(){
    clear_record(); 
    $('input[name=settings]').attr('checked', false); //hides settings
});

//compensation
$(document).on('touchstart', 'section .compensation', function() {
    expand_compensation($(this).closest('.compensation'));
});
$(document).on('change', 'section .compensation select', function() {
    var $comp = $(this).closest('section'),
        day = $comp.attr('data-day');
    
    var t = function() {
        var hours = $comp.find('.compensation .hours').val(),
            minutes = $comp.find('.compensation .minutes').val();
        
        return hhmm_to_s(lead_zero(hours) + ':' + minutes);
    };
    
    //set compensation if one was set
    if(t() === 0) {
        delete user.compensation[day];
    } else {
        user.compensation[day] = t();
    }

    draw_compensation();
    expand_compensation($comp.find('.compensation'));
});
$(document).on('change', 'section .compensation .day_off', function() {
    $(this).closest('.compensation')
    .find('  .hours').val($(this).is(':checked') ? work_hours_in_day() : '0').end()
    .find('.minutes').val('00');
    
    $(this).closest('.compensation').find('select').change();
});
//close compensation by clicking outside
$(document).on('touchstart', function (e) {
    if (!$('.compensation').is(e.target) && $('.compensation').has(e.target).length === 0) {
        $('.compensation fieldset').hide();
    }
});
//close compensation by clicking its time again
$(document).on('touchstart', '.compensation span', function (e) {
    if ($(this).parent().find('fieldset').is(':visible')) {
        e.stopImmediatePropagation();
        $('.compensation fieldset:visible').hide();
    }
});


/*//======================================\\*\
                declarations
*///======================================\\\*
$.fn.removeText = function() {
    return $(this)
    .contents()
    .filter(function() {
        return this.nodeType === 3; //Node.TEXT_NODE
    }).remove();
};

var 
defaults = {
    lang: ~(window.navigator.userLanguage || window.navigator.language).indexOf('fr') ? 'fr' : 'en',
    work_days: { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false },
    sentence: 35, //hours per week
    active: false, //status
    record: [],
    compensation: {}
},
user = typeof $.cookie('flex_user') !== 'undefined' ? JSON.parse($.cookie('flex_user')) : defaults,
days = [
    ['Sunday', 'dimanche'], //make days and l() dynamic on element (use data-?)
    ['Monday', 'lundi'], 
    ['Tuesday', 'mardi'], 
    ['Wednesday', 'mercredi'], 
    ['Thursday','jeudi'],
    ['Friday', 'vendredi'], 
    ['Saturday', 'samedi']
],
label = {
    $in: ['icon-play', 'icon-pause'],
},

l = function(arr) { //language
    return arr[+(user.lang === 'fr')] || ''; 
},
get_day = function() { //current day
    return new Date().getDay();
},
get_time = function() { //returns string hh:mm
    return lead_zero(new Date().getHours()) + ':' + lead_zero(new Date().getMinutes())
},

$day = function(num) {
    return $('article section').filter(function() {
        return +$(this).attr('data-day') === +num;
    });
},
latest_record = function() {
    return user.record[user.record.length - 1];
},

hhmm_to_unix = function(time) { //today hh:mm -> unix time
    var d = new Date;
    return Date.parse(d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + time + ':00');
    //:00 --> now seconds?
}, 
hhmm_to_s = function(time) { //any number of hh:mm -> secs
    time = time.split(':');
    return time[0] * 60 * 60 + time[1] * 60;
}, 
s_to_hms = function(ms, hide_secs) { // any number of secs -> hh:mm
    ms = Math.abs(ms);
    var hours = Math.floor(ms / 3600),
        minutes = lead_zero(Math.floor(ms / 60 % 60)),
        seconds = lead_zero(Math.floor(ms % 60));
    
    return hours + ':' + minutes + (hide_secs ? '' : ':' + seconds);
}, 

lead_zero = function(num) {
    return (num < 10 ? '0' : '') + num;
}, 

time_spent_paused = function() {
    var ms_spent_paused = 0,
        paused_stamp;
        
    $.each(user.record, function(i, record) {
        var timestamp = record.timestamp;
    
        //start time is not needed
        if(i === 0) return true;
        
        //time @ resume - time @ pause
        if(i % 2) paused_stamp = timestamp;
        else ms_spent_paused += Math.abs(paused_stamp - timestamp);
    });
    
    //if paused, add time spent from last paused until now
    if (!user.active) ms_spent_paused += Math.abs(Math.min(latest_record().timestamp - $.now(), 0));
    
    return ms_spent_paused;
}, 
time_compensated = function() {
    var time_compensated = 0;
    
    $.each(user.compensation, function(i, time) {
        time_compensated += time;
    });

    return time_compensated * 1000; //ms
}, 
time_remaining = function() {  
    var sentence_length = user.sentence * 60 * 60 * 1000,
        time_served = Math.max(latest_record().timestamp, $.now()) - user.record[0].timestamp - time_spent_paused() + time_compensated(),
        time_remains = (sentence_length - time_served) / 1000;
        
        return (time_remains > 0 ? '-' : '+') + s_to_hms(time_remains);
}, 
work_hours_in_day = function() {
    var work_days = $.grep(Object.keys(user.work_days), function(i) {
        return user.work_days[i] === true;
    }).length;
    
    return user.sentence / work_days;
}, 

draw_day_sections = function() {
    $('article section').remove();
    
    var recorded_day = {};
    //include days with existing records
    $.each(user.record, function(i, record) {
        recorded_day[record.day] = true;
    });
    $.each(Object.keys(user.compensation), function(i, day) {
        recorded_day[day] = true;
    });
    
    //include today
    recorded_day[get_day()] = true;

    $.each(days, function(i, day_name) {
        if(!user.work_days[i] && !recorded_day[i]) return true; //draw only work days, today and days in record
        $.template('section', {
            'class' : day_name[0].toLowerCase(),
            'day': i,
            'day_name': l(day_name)
        }).appendTo('article').css('z-index', 7 - i);
    });
}, 
draw_entries = function() {
    $('.entries').html('');
    $.each(user.record, function(i, record) {
        var $entry = $.template('.entry', {
            status: record.active ? 'active' : 'paused',
            timestamp: record.timestamp,
            time: record.time
        });
        
        $day(record.day).find('.entries').append($entry);
    });
    
    $('button#in').prop('class', label.$in[+user.active]);
}, 
draw_elapsed = function() {
    function time_spent_active(day) {
        var ms_spent_playing = 0,
            activated_stamp,
            day_records = user.record.filter(function(record) { 
                return record.day === day; //records only for this day
            });
    
        function first_moment_of_day(timestamp) { //timestamp -> last timestamp of that day
            var d = new Date(timestamp);
            return Date.parse(d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate());
        }
    
        function last_moment_of_day(timestamp) { //timestamp -> last timestamp of that day
            var d = new Date(timestamp);
            return Date.parse(d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' 23:59:59');
        }

        //no records for day
        if (!day_records.length) return 0;
        
        //if first record is pause, simulate activate record at beginning of day
        if(day_records[0].active === false) {
            day_records.unshift({ timestamp: first_moment_of_day(day_records[0].timestamp), active: true });
        }
        //if last record is active, add a final pause record with either current timestamp (if day isn't over) or last moment of day
        if(day_records[day_records.length - 1].active) {
            day_records.push({ timestamp: day === get_day() ? $.now() : last_moment_of_day(day_records[day_records.length - 1].timestamp), active: false });
        }

        $.each(day_records, function(i, record) {
            var timestamp = record.timestamp;
            
            if (!record.active) ms_spent_playing += Math.abs(timestamp - activated_stamp);
            else activated_stamp = timestamp;
        });
        
        return ms_spent_playing;
    }
    
    $.each(days, function(day) {
        var active_time = time_spent_active(day) / 1000,
            $elapsed = $day(day).find('.elapsed');

        $elapsed.html(s_to_hms(active_time)).toggle(active_time !== 0);
    });
}, 
draw_compensation = function() {
    $.each(Object.keys(user.work_days), function(day) {
        var time = typeof user.compensation[day] !== 'undefined' ? user.compensation[day] : 0,
            compensation_time = s_to_hms(time, true);
            
        $day(day).find('.compensation span').html('+' + compensation_time).parent()
        .find('  .hours').val(compensation_time.split(':')[0]).end() //<select>
        .find('.minutes').val(compensation_time.split(':')[1]);
        
        if(time === 0) $day(day).find('.compensation span').html('+');
    });
    
    update_language();
}, 
expand_compensation = function(elem) {
    $('.compensation fieldset').hide();
    $(elem).find('fieldset').show();
}, 

draw_settings = function() { //update inputs to reflect user object
    //toggle language on elements
    $('#settings label[data-en], #settings button').each(function() {
        //get label in user's language
        var label = $(this).attr('data-' + user.lang);
        
        //insert labels
        $(this).removeText();
        $(this).find('[type=text], [type=number]').before(label + ' ');
        $(this).filter('button').html(label);
    });
   
    //radio buttons
    $('#settings input[type=radio]').each(function() {
        $(this).prop('checked', $(this).val() == user[$(this).prop('name')]); //==
    });
    
    //number inputs
    $('#settings input[type=number]').each(function() {
        $(this).val(user[$(this).prop('name')]);
    });
    
    //work days
    $('#settings input[name=work_days]').each(function(i) {
        //language of labels
        $(this).parent().removeText();
        $(this).after(l(days[i]).substr(0,3) + '. ');
        //toggle inputs
        $(this).prop('checked', user.work_days[i]);
    });

    //!put relevant shit in update_language

    update_language();
},

update_language = function() {
    $('.compensation [data-en]').each(function() {
        //get label in user's language
        var label = $(this).attr('data-' + user.lang);
        
        //insert labels
        $(this).removeText();
        $(this).append(label);
    });
},

update_time = function() { //update time and remaining time
    function is_older_instance() { //if saved record is the same as working record
        return false;
    }
    
    function write_user_cookie() {
        $.cookie('flex_user', JSON.stringify(user), { expires: 4000, path: '/' });
    }
    
    var cookie_user = typeof $.cookie('flex_user') !== 'undefined' ? JSON.parse($.cookie('flex_user')) : {};
    
    //write cookie if changed
    if(user && typeof $.cookie('flex_user') !== 'undefined') { //cookie exists
        if(user.record.length && is_older_instance()) { 
            //user navigated to older instance of flex, so load more recent instance from cookie
            user = JSON.parse($.cookie('flex_user'));
            redraw();
        } else if (JSON.stringify(user) !== JSON.stringify(cookie_user)) { 
            //user has made changes
            write_user_cookie();
        }
    } else if (typeof $.cookie('flex_user') === 'undefined') { //if cookie still does not exist, create it
        write_user_cookie();
    }

    //current time in #hud
    $('#hud').val(get_time());
    
    //if records are empty, don't display elapsed
    if(!user.record.length) return false;
    
    //current day style
    $('section').each(function() {
        $(this).toggleClass('active-day', +$(this).attr('data-day') === latest_record().day);
        $(this).toggleClass('today', +$(this).attr('data-day') === get_day());
    });
    
    //update time remaining
    var remaining = time_remaining();

    $('.remain').html(remaining)
    .toggleClass('overtime', remaining.charAt(0) === '+');

    draw_elapsed();
},

redraw = function() {
    draw_settings();
    draw_day_sections();
    draw_entries();
    draw_elapsed();
    draw_compensation();
    
    update_time();
}, 

clear_record = function() {
    user.record = [];
    user.compensation = {};
    user.active = false;
    
    $.cookie('flex_user', JSON.stringify(user), { expires: 4000, path: '/' });

    redraw();
};


/*//======================================\\*\
                initialization
*///======================================\\\*
setInterval(update_time, 50);
redraw();

document.addEventListener('deviceready', function() {
    navigator.splashscreen.hide();
});

//});
