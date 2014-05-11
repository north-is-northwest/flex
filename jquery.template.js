;(function($) {
	$.template = function(selector, params) {
        //get selector from <template>
        var $template = $($('template').html()),
            token = ['\\{\\{\\s*', '\\s*\\}\\}'],
            content = ($template.filter(selector).length ? $template.filter(selector) : $template.find(selector)).prop('outerHTML'); //get selector and search in children if not found
    
        //return empty jquery object if selector does not exist
        if(typeof content === 'undefined') return $('');
        
        //handle no params
        params = params || {};
        
        //replace {{keys}} with values
        $.each(Object.keys(params), function(i, key) {
            content = content.replace(new RegExp(token[0] + key + token[1]), params[key]);
        });
        
        //remove any unspecified {{ }}
        content = content.replace(new RegExp(token[0] + '.*' + token[1], 'g'), '');
        
        return $(content);
    };
})(jQuery);