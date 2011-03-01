 $(document).ready(function() {
 	var getClientInfo = function(){
		$.ajax({
			url: '/clientInfo',
			dataType: 'json',
			success: function(tickets){
				var hasItem = false;			
				for (var key in tickets){
					hasItem = true;
					var tr = $('#' + key)
					if(tr && tr.length > 0 ){
						tr.find('td.link a').text(tickets[key].active?'high-speed':'low-speed');
						tr.find('td.position').text(tickets[key].position);
					}
					else{
						$('#qtable tr:last').after('<tr id="' + key +'"><td>' + tickets[key].filename + '</td><td class="position">' + tickets[key].position + '</td><td class="link"><a href="/' + key + '/' + tickets[key].hash +'/' + tickets[key].filename + '">' + (tickets[key].active?'high-speed':'low-speed')+ '</td></tr>')
					}
				}
				if(hasItem) $('#empty').remove();
				window.setTimeout(getClientInfo, 2000);
			}
		})
	}
	getClientInfo();
 });
