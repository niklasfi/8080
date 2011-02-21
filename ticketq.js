module.exports = TicketQ;

Ticket = function(TicketQ, filename){
	while(this.id==null || TicketQ.tickets[this.ID]!=null) 
		this.id=Math.floor(Math.random() * (100000000 + 1));
	this.created = Date.now();
	this.skip = false;
	this.filename = filename;
	this.range = {};
	this.ready = false;
	this.next = null;
	this.res = [];
}

function TicketQ(){
	this.head=null;
	this.tail=null;
	this.tickets = {};
	this.qlen = 0;
	setInterval((this.clean).bind(this),24*3600*1000)
}

TicketQ.prototype.append = function(filename){
	var newTicket = new Ticket(this, filename);
	this.tickets[newTicket.id] = newTicket;
	this.qlen+=1;
	console.log(this.qlen);
	if(this.head === null) this.head=newTicket; //Q empty, set head;
	else this.tail.next = newTicket; //Q not empty, last object needs to be linked
	return this.tail = newTicket;
}

TicketQ.prototype.shift = function(filename){
	var first=null;
	while (this.head !== null && (first === null || first.skip)){
		first = this.head;
		this.head = this.head.next;
		this.qlen-=1;
	}
	return first;
}

TicketQ.prototype.removeId = function(id){
	var t = this.tickets[id];
	t.skip = true;
	this.tickets[id]=undefined;
}

TicketQ.prototype.clean = function(){
	var now = Date.now()
	for (var i in this.tickets)
		if( (now - this.tickets[i].created).milliseconds > 24*3600*1000) this.removeId(i);
}
