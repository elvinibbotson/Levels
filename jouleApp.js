function id(el) {
	// console.log("return element whose id is "+el);
	return document.getElementById(el);
}

function pad(n) {
	// console.log('pad '+n+' to 5 chars - starting from '+n.length);
	var num=n;
	var a=5-num.length;
	for(var i=0;i<a;i++) num='&nbsp;'+num;
	return num;
}

'use strict';
	
// GLOBAL VARIABLES
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
var db=null;
var logs=[];
var log=null;
var logIndex=null;
var currentLog=null;
var view='listView';
var currentDialog=null;
var dragStart={};
var canvas=null;
var overlay=null;
var canvasL=0;
var intervalX=0;
var intervalY=0;
var lastSave=-1;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";

// EVENT LISTENERS

// DRAG TO GO BACK
id('main').addEventListener('touchstart', function(event) {
    // console.log(event.changedTouches.length+" touches");
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    // console.log('start drag at '+dragStart.x+','+dragStart.y+' view is '+view);
})

id('main').addEventListener('touchmove', function(event) {
	var x=event.changedTouches[0].clientX-dragStart.x;
	x+=canvasL;
	id('graphPanel').style.left=x+'px';
})

id('main').addEventListener('touchend', function(event) {
    var drag={};
    drag.x=dragStart.x-event.changedTouches[0].clientX;
    drag.y=dragStart.y-event.changedTouches[0].clientY;
    // console.log('drag '+drag.x+','+drag.y+' view is '+view);
    if(view=='listView') {
    	if(Math.abs(drag.y)>50) return; // ignore vertical drag
    	if(drag.x<-50) { // drag right to show graph
    		console.log('drag.x is '+drag.x);
    		view='graph';
    		id('listPanel').style.display='none';
    		id('heading').style.display='none';
    		id('buttonNew').style.display='none';
    		drawGraph();
    	}
    	else if((drag.x>50)&&(currentDialog)) toggleDialog(currentDialog,false); // drag left to close dialog
    }
    else { // drag vertically to return to list view
    	canvasL-=drag.x;
    	// console.log('canvas left: '+canvasL);
    	if(Math.abs(drag.x)>50) return; // ignore horizontal drags
    	if(Math.abs(drag.y)>50) {
    		view='listView';
    		id('graphPanel').style.display='none';
    		id('graphOverlay').style.display='none';
    		id('listPanel').style.display='block';
    		id('heading').style.display='block';
    		id('buttonNew').style.display='block';
    		// populateList();
    	}
    }
})

id('graphOverlay').addEventListener('click',function(event) {
	intvl=['month','quarter','year'];
	// var x=event.clientX;
	// var y=event.clientY;
	var x=Math.floor(3*event.clientX/scr.w);
	// console.log('tap at '+event.clientX+','+y+': '+x);
	if(event.clientY<80) console.log(intvl[x]);
	drawGraph(intvl[x]);
})

// TAP ON HEADER
id('heading').addEventListener('click',function() {toggleDialog('dataDialog',true);})

// DISPLAY MESSAGE
function display(message) {
	id('message').innerText=message;
	toggleDialog('messageDialog',true);
}

// NEW BUTTON
id('buttonNew').addEventListener('click', function() { // show the log dialog
	console.log("show add jotting dialog with today's date, 1 day duration, blank text field and delete button disabled");
    toggleDialog('logDialog',true);
	var d=new Date().toISOString();
	id('logDate').value=d.substr(0,10);
	id('logGrid').value=null;
	id('logPV').value=null;
	id('logSolar').value=null;
	id('logYield').value=null;
	id('logCons').value=null;
	log={};
	logIndex=null;
	id("buttonDeleteLog").disabled=true;
	id('buttonDeleteLog').style.color='gray';
});

// SAVE NEW/EDITED LOG
id('buttonSaveLog').addEventListener('click', function() {
	log.date=id('logDate').value;
	log.grid=id('logGrid').value;
	log.pv=id('logPV').value;
	log.solar=id('logSolar').value;
	log.yield=id('logYield').value;
	log.cons=id('logCons').value;
	/*
	log.luxGrid=id('luxGrid').value;
	log.luxPV=id('luxPV').value;
	log.luxCons=id('luxCons').value;
	log.battery=id('luxBattery').value;
	*/
    toggleDialog('logDialog',false);
	console.log("save log - date: "+log.date);
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	console.log("save log - logIndex is "+logIndex);
	if(logIndex===null) { // add new log
		var request=dbObjectStore.add(log);
		request.onsuccess=function(event) {
			console.log("new log added: "+log.text);
			populateList();
		};
		request.onerror=function(event) {console.log("error adding new log");};
	}
	else { // update existing log
		request=dbObjectStore.put(log); // update log in database
		request.onsuccess=function(event)  {
			console.log("log "+log.id+" updated");
			populateList();
		};
		request.onerror = function(event) {console.log("error updating log "+log.id);};
	}
});

/* CANCEL NEW/EDIT LOG
id('buttonCancelLog').addEventListener('click', function() {
    toggleDialog('logDialog',false); // close add new jotting dialog
});
*/
// DELETE LOG
id('buttonDeleteLog').addEventListener('click', function() {
	var text=log.text; // initiate delete log
	console.log("delete log "+text);
	toggleDialog("deleteDialog", true);
	id('deleteText').innerHTML=text;
	toggleDialog("logDialog", false);
});

// CONFIRM DELETE
id('buttonDeleteConfirm').addEventListener('click', function() {
	console.log("delete log "+logIndex+" - "+log.text); // confirm delete log
	var dbTransaction=db.transaction("logs","readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore("logs");
	var request=dbObjectStore.delete(log.id);
	request.onsuccess=function(event) {
		console.log("log "+log.id+" deleted");
		logs.splice(logIndex,1); // not needed - rebuilding logs anyway
		populateList();
	};
	request.onerror=function(event) {console.log("error deleting log "+log.id);};
	toggleDialog('deleteDialog', false);
});

/* CANCEL DELETE
id('buttonCancelDelete').addEventListener('click', function() {
    toggleDialog('deleteDialog', false); // close delete dialog
});
*/
// SHOW/HIDE DIALOGS
function  toggleDialog(d, visible) {
    console.log('toggle '+d+' - '+visible);
    if(currentDialog) id(currentDialog).style.display='none';
    if(visible) {
    	currentDialog=d;
    	id(d).style.display='block';
    }
    /*
  	id('buttonNew').style.display=(visible)?'none':'block';
	if(d=='logDialog') { // toggle log dialog
	    if (visible) {
      		id("logDialog").style.display='block';
    	} else {
      		id("logDialog").style.display='none';
    	}
	}
	else if(d=='deleteDialog') { // toggle DELETE dialog
	  	if(visible) {
      		id('deleteDialog').style.display='block';
   		} else {
     		id('deleteDialog').style.display='none';
    	}
	}
	else if(d=='importDialog') { // toggle file chooser dialog
	  	if(visible) {
      		id('importDialog').style.display='block';
    	} else {
      		id('importDialog').style.display='none';
    	}
	}
	else if(d=='dataDialog') { // toggle file chooser dialog
	  	if(visible) {
      		id('dataDialog').style.display='block';
    	} else {
      		id('dataDialog').style.display='none';
    	}
	}
	*/
}

// OPEN SELECTED LOG FOR EDITING
function openLog() {
	console.log("open log: "+logIndex);
	log=logs[logIndex];
	toggleDialog('logDialog',true);
	id('logDate').value=log.date;
	id('logGrid').value=log.grid;
	id('logPV').value=log.pv;
	id('logSolar').value=log.solar;
	id('logYield').value=log.yield;
	id('logCons').value=log.cons;
	id('buttonDeleteLog').disabled=false;
	id('buttonDeleteLog').style.color='red';
}
  
// POPULATE LOGS LIST
function populateList() {
	console.log("populate log list");
	logs=[];
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {  
		var cursor=event.target.result;  
    	if(cursor) {
			logs.push(cursor.value);
			cursor.continue();
    	}
		else {
			console.log("list "+logs.length+" logs");
			logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
			console.log("populate list");
			id('list').innerHTML=""; // clear list
			var html="";
			var d="";
			var mon=0;
  			for(var i=logs.length-1; i>=0; i--) { // list latest first
  			 	var listItem=document.createElement('li');
				listItem.index=i;
	 		 	listItem.classList.add('log-item');
				listItem.addEventListener('click', function(){logIndex=this.index; openLog();});
				var itemText=document.createElement('span');
				d=logs[i].date;
				mon=parseInt(d.substr(5,2))-1;
				mon*=3;
				d=months.substr(mon,3)+" "+d.substr(2,2);
				html='<span class="grey">'+d+'</span><span class="red">'+pad(logs[i].grid)+'</span><span class="green">'+pad(logs[i].pv)+'</span><span class="blue">'+pad(logs[i].yield)+'</span><span class="orange">'+pad(logs[i].cons)+'</span><span class="yellow">'+pad(logs[i].solar)+'</span>';
				itemText.innerHTML=html;
				listItem.appendChild(itemText);
		  		id('list').appendChild(listItem);
  			}
	        var thisMonth=new Date().getMonth();
	        if(thisMonth!=lastSave) backup(); // monthly backups
  		}
	}
	request.onerror=function(event) {
		console.log("cursor request failed");
	}
}

// DRAW GRAPH
function drawGraph(interval) {
	if(interval==null) interval='month'; // interval can be month (default), quarter or year
	console.log('GRAPH - interval is '+interval);
	var letters='';
	var n=0;
	var margin=90; // bottom margin to allow space for Android controls
	var intervalV=0; // kWh interval for horizontal gridlines
	if(interval=='month') {
		n=logs.length-1;
		intervalV=100; // grid lines at 100kWh intervals
		letters='JFMAMJJASOND';
	}
	else if(interval=='quarter') {
		n=Math.floor(logs.length/3)-1;
		intervalV=250; // grid lines at 250kWh intervals
		letters="4123";
	}
	else {
		n=Math.floor(logs.length/12)-1;
		intervalV=1000; // grid lines at 1000kWh intervals (no letters)
	}
	console.log('graph spans '+n+' intervals');
	canvasL=(14-n)*intervalX;
	id('graphPanel').style.left=canvasL+'px';
	id("graphPanel").style.width=(n*intervalX+10)+'px';
	id('canvas').width=n*intervalX+10;
	id('graphPanel').style.display='block';
	id('graphOverlay').style.display='block';
	// clear canvases
	overlay.clearRect(0,0,scr.w,scr.h);
	canvas.clearRect(0,0,id('canvas').width+10,scr.h);
	// draw interval tabs
	overlay.fillStyle='black';
	overlay.fillRect(0,0,scr.w,48); // black background
	// then draw legend
	overlay.font='20px Monospace';
	overlay.fillStyle='hotpink';
	overlay.fillText('grid',25,20);
	overlay.fillStyle='lightgreen';
	overlay.fillText('PV',100,20);
	overlay.fillStyle='skyblue';
	overlay.fillText('heat',150,20);
	overlay.fillStyle='orange';
	overlay.fillText('ASHP',225,20);
	overlay.fillStyle='yellow';
	overlay.fillText('solar',300,20);
	overlay.lineWidth=1;
	overlay.fillStyle='#333'; // draw 3 dark (background) tabs
	overlay.fillRect(5,24,scr.w/3-10,24);
	overlay.fillRect(scr.w/3+5,24,scr.w/3-10,24);
	overlay.fillRect(2*scr.w/3+5,24,scr.w/3-10,24);
	overlay.fillStyle='dimgray'; // draw gray foreground tab for current interval
	console.log('interval: '+interval);
	if(interval=='month') overlay.fillRect(5,24,scr.w/3-10,24);
	else if(interval=='quarter') overlay.fillRect(scr.w/3+5,24,scr.w/3-10,24);
	else overlay.fillRect(2*scr.w/3+5,24,scr.w/3-10,24);
	overlay.fillStyle='white'; // label tabs
	overlay.fillText('month',20,46);
	overlay.fillText('quarter',scr.w/3+20,46);
	overlay.fillText('year',2*scr.w/3+20,46);
	// draw horizontal gridlines and kWh labels on overlay
	for(i=1;i<11;i++) overlay.fillText(i*intervalV,2,scr.h-margin-i*intervalY-5); // kWh at 100px intervals
	overlay.fillText('kWh',2,scr.h-margin-11*intervalY+20); // vertical axis label
	overlay.strokeStyle='silver'; // grey lines
	overlay.beginPath();
	for(i=1;i<13;i++) {
		overlay.moveTo(0,scr.h-margin-i*intervalY);
		overlay.lineTo(scr.w,scr.h-margin-i*intervalY); // grey lines
	}
	// draw horizontal gridlines for COP graph
	for(i=0;i<6;i++) {
		overlay.moveTo(0,scr.h-margin+i*intervalY/5);
		overlay.lineTo(scr.w,scr.h-margin+i*intervalY/5); // grey lines
	}
	overlay.stroke();
	// set start log for drawing graphs
	var startLog=1; // defaults to second log (for month intervals)
	var mon=-1;
	var step=1;
	if(interval=='quarter') {
		while(mon%3!=0) {
			startLog++;
			mon=parseInt(logs[startLog].date.substr(5,2));
			console.log('log '+startLog+' month: '+mon+' '+letters[m]);
			// startLog++;
		}
		step=3; // 3-month steps
		startLog+=step;
		console.log('quarterly intervals - start at log '+startLog+' step '+step);
	}
	else if(interval=='year') {
		while(mon%12!=0) {
			mon=parseInt(logs[startLog].date.substr(5,2));
			console.log('log '+startLog+' month: '+mon);
			startLog++;
		}
		step=12; // 12-month steps
		startLog+=step;
		console.log('yearly intervals - start at log '+startLog+' step '+step);
	}
	else console.log('monthly intervals - start at log '+startLog+' step '+step);
	// draw vertical gridlines and interval labels on canvas
	canvas.strokeStyle='silver'; // grey lines
	canvas.font='20px Monospace';
	canvas.fillStyle='white'; // white text
	console.log('draw vertical gridlines');
	canvas.beginPath();
	var i=startLog-step;
	console.log('first gridline is for '+logs[i].date+'; startLog is '+startLog);
	var m=0;
	var year=0;
	while(i<logs.length) {
		x=Math.floor(i/step)*intervalX;
		canvas.moveTo(x,scr.h-margin);
		canvas.lineTo(x,scr.h-margin-12*intervalY); // vertical gridline
		if(interval=='month') {
			m=parseInt(logs[i].date.substr(5,2))-1;
			canvas.fillText(letters.charAt(m),x-5,scr.h-margin-11*intervalY-5); // month letter just above and below grid
			canvas.fillText(letters.charAt(m),x-5,scr.h-margin-5);
			if(m<1) {
				year=logs[i].date.substr(0,4);
				canvas.fillText(year,x,scr.h-margin-11*intervalY-24); // YYYY above month labels
			}
		}
		else if(interval=='quarter') {
			m=parseInt(logs[i].date.substr(5,2));
			console.log('month: '+m);
			m/=3; // 1,2,3,4
			m%=4; // 1,2,3,0
			console.log('quarter: '+letters.charAt(m)+': '+letters[m]);
			canvas.fillText(letters.charAt(m),x-5,scr.h-margin-11*intervalY-5); // quarter symbol just above and below grid
			canvas.fillText(letters.charAt(m),x-5,scr.h-margin-5);
			if(m<1) {
				year=logs[i].date.substr(0,4);
				year++; // start of following year
				canvas.fillText(year,x-5,scr.h-margin-11*intervalY-24); // YYYY above month labels
			}
		}
		else {
			year=logs[i].date.substr(2,2); // YY just above and below grid
			console.log('year: '+year);
			canvas.fillText(year,x-5,scr.h-margin-11*intervalY-5); // quarter symbol just above and below grid
			canvas.fillText(year,x-5,scr.h-margin-5);
		}
		i+=step;
	}
	canvas.stroke();
	// first draw grid power usage
	canvas.strokeStyle='hotpink';
	canvas.setLineDash([]);
	canvas.lineWidth=3;
	canvas.beginPath();
	i=startLog;
	x=(Math.floor(i/step)-1)*intervalX;
	var val=0;
	console.log('start from log '+i+' grid');
	while(i<logs.length) {
		val=logs[i].grid-logs[i-step].grid; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX;
		var y=scr.h-margin-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
	}
    canvas.stroke();
    // next draw PV yield
    console.log('PV');
    canvas.strokeStyle='lightgreen';
    canvas.setLineDash([]);
    canvas.beginPath();
    i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    while(i<logs.length) {
		val=logs[i].pv-logs[i-step].pv; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX
		var y=scr.h-margin-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
	}
	canvas.stroke();
	// thermal solar yield
	console.log('solar');
	canvas.strokeStyle='yellow';
	canvas.setLineDash([]);
    canvas.beginPath();
    i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    while(i<logs.length) {
    	val=logs[i].solar-logs[i-step].solar; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX;
		var y=scr.h-margin-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
    }
	canvas.stroke();
	// heat pump yield...
	console.log('yield');
	canvas.strokeStyle='skyblue';
	canvas.setLineDash([]);
    canvas.beginPath();
    i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    while(i<logs.length) {
		val=logs[i].yield-logs[i-step].yield; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX;
		var y=scr.h-margin-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
	}
	canvas.stroke();
	// heat pump input...
	console.log('usage');
	canvas.strokeStyle='orange';
    canvas.beginPath();
    i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    while(i<logs.length) {
    	val=logs[i].cons-logs[i-step].cons; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX;
		var y=scr.h-margin-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
    }
	canvas.stroke();
	// COP graph...
	canvas.fillStyle='black'; // black background
	canvas.fillRect(0,scr.h-margin,id('canvas').width+10,intervalY);
	canvas.fillStyle='white';
	canvas.strokeWidth=0;
	canvas.beginPath();
	i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    canvas.moveTo(0,scr.h-margin+intervalY);
    while(i<logs.length) {
    	val=(logs[i].yield-logs[i-step].yield)/(logs[i].cons-logs[i-step].cons); // COP ratio
    	console.log('******* COP: '+val);
		val*=intervalY/5; // convert kWh to pixels
		console.log('******* '+val+' pixels');
		x+=intervalX;
		var y=scr.h-margin+intervalY-val;
		// if(i==startLog) canvas.moveTo(x,y);
		// else 
		canvas.lineTo(x,y);
		i+=step;
    }
    canvas.lineTo(x,scr.h-margin+intervalY);
    canvas.closePath();
    canvas.fill();
    overlay.fillText('COP',5,scr.h-margin+20);
}

function selectLog() {
	if(currentLog) currentLog.children[0].style.backgroundColor='gray'; // deselect any previously selected item
    itemIndex=parseInt(logIndex);
	log=logs[logIndex];
	console.log("selected item: "+logIndex);
	currentLog=id('list').children[logIndex];
	// currentLog.children[0].style.backgroundColor='black'; // highlight new selection
	currentLog.style.backgroundColor='black'; // highlight new selection
}

// DATA
id('backupButton').addEventListener('click',function() {toggleDialog('dataDialog',false); backup();});
id('importButton').addEventListener('click',function() {toggleDialog('importDialog',true)});
/* id('dataCancelButton').addEventListener('click',function() {toggleDialog('dataDialog',false)}); */

// IMPORT FILE
id("fileChooser").addEventListener('change',function() {
    var file=id('fileChooser').files[0];
});
id('confirmImport').addEventListener('click',function(event) {
	var file=id('fileChooser').files[0];
    var fileReader=new FileReader();
    fileReader.onload=function() {
    	var data=fileReader.result;
    	console.log('file read');
    	var json=JSON.parse(data);
    	console.log("json: "+json);
    	var logs=json.logs;
    	console.log(logs.length+" logs loaded");
    	var dbTransaction=db.transaction('logs',"readwrite");
    	console.log('database ready - save '+logs.length+' logs');
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	for(var i=0;i<logs.length;i++) {
    		console.log("add log "+i);
    		var request = dbObjectStore.add(logs[i]);
    		request.onsuccess = function(e) {
    			console.log("log "+i+" added");
    		};
    		request.onerror = function(e) {console.log("error adding log");};
    	}
    	dbTransaction.oncomplete=function(e) {
    		toggleDialog('importDialog',false);
    		display("logs imported - restart");
    	}
    }
    fileReader.onerror=function() {
    	alert('read error: '+fileReader.error);
    }
    fileReader.readAsText(file);
});
id('cancelImport').addEventListener('click',function() {
    console.log('cancel import');
    toggleDialog('importDialog', false);
});

// BACKUP
function backup() {
  	console.log("save backup");
  	var fileName="joule";
	var date=new Date();
	fileName+=date.getFullYear();
	if(date.getMonth()<9) fileName+='0'; // date format YYYYMMDD
	fileName+=(date.getMonth()+1);
	if(date.getDate()<10) fileName+='0';
	fileName+=date.getDate()+".json";
	var dbTransaction=db.transaction('logs',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('logs');
	console.log("indexedDB objectStore ready");
	var logs=[];
	var request=dbObjectStore.openCursor();
	request.onsuccess = function(event) {  
		var cursor=event.target.result;  
    	if(cursor) {
		    logs.push(cursor.value);
			console.log("log "+cursor.value.id+", date: "+cursor.value.date);
			cursor.continue();  
    	}
		else {
			console.log(logs.length+" logs - sort and save");
    		logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
			var data={'logs': logs};
			var json=JSON.stringify(data);
			var blob=new Blob([json],{type:"data:application/json"});
  			var a=document.createElement('a');
			a.style.display='none';
    		var url=window.URL.createObjectURL(blob);
			console.log("data ready to save: "+blob.size+" bytes");
   			a.href=url;
   			a.download=fileName;
    		document.body.appendChild(a);
    		a.click();
			display(fileName+" saved to downloads folder");
			var today=new Date();
			lastSave=today.getMonth();
			window.localStorage.setItem('jouleSave',lastSave); // remember month of backup
		}
	}
}

// START-UP CODE
scr.w=screen.width;
scr.h=screen.height;
console.log('screen size: '+scr.w+'x'+scr.h+'px');
intervalX=Math.floor(scr.w/14); // 14 intervals visible across graph
intervalY=Math.floor(scr.h/15); // 15 intervals vertically 
console.log('intervals: '+intervalX+'x'+intervalY+'px');
id("canvas").width=scr.w;
id("canvas").height=scr.h;
console.log('canvas size: '+id("canvas").width+'x'+id("canvas").height);
id("overlay").width=scr.w;
id("overlay").height=scr.h;
canvas=id('canvas').getContext('2d');
overlay=id('overlay').getContext('2d');
lastSave=window.localStorage.getItem('jouleSave'); // get month of last backup
console.log('lastSave: '+lastSave);
var request=window.indexedDB.open("jouleDB",2);
request.onsuccess=function(event) {
    db=event.target.result;
    var dbTransaction=db.transaction('logs',"readwrite");
    var dbObjectStore=dbTransaction.objectStore('logs');
    logs=[];
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
		    logs.push(cursor.value);
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries!");
		    console.log(logs.length+" logs");
		    if(logs.length<1) { // no logs: offer to restore backup
		        toggleDialog('importDialog',true);
		        return
		    }
		    logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
		    populateList();
	    }
    };
};
request.onupgradeneeded=function(event) {
	db=event.target.result;
	if (!db.objectStoreNames.contains('logs')) { // if there's no "logs" store..
    	db.createObjectStore('logs', {keyPath: 'id',  autoIncrement: true}); // ..create it
    	display('new logs object store created');
	}
	console.log("new logs ObjectStore created");
};
request.onerror=function(event) {
	alert("indexedDB error");
};
// implement service worker if browser is PWA friendly 
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('jouleSW.js', {
		scope: '/joule/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
