function id(el) {
	return document.getElementById(el);
}
function pad(n) {
	// console.log('pad '+n+' to 5 chars - starting from '+n.length);
	var num=n;
	// console.log('n: '+n+' ('+n.length+' chars)');
	while(num.length<5) num='&nbsp;'+num;
	return num;
}
'use strict';
// GLOBAL VARIABLES
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
// var db=null;
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
	id('logPVa').value=null;
	id('logPVb').value=null;
	id('logYield').value=null;
	id('logCons').value=null;
	log={};
	id("buttonDeleteLog").disabled=true;
	id('buttonDeleteLog').style.color='gray';
});
// SAVE NEW/EDITED LOG
id('buttonSaveLog').addEventListener('click', function() {
	log.date=id('logDate').value;
	log.grid=id('logGrid').value;
	log.pvA=id('logPVa').value;
	log.pvB=id('logPVb').value;
	log.yield=id('logYield').value;
	log.cons=id('logCons').value;
    toggleDialog('logDialog',false);
	console.log("save log - date: "+log.date);
	logs.push(log);
	saveData();
	populateList();
	/* OLD CODE...
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
	*/
});
// DELETE LOG
id('buttonDeleteLog').addEventListener('click', function() {
	var text=log.date; // initiate delete log
	console.log("delete log date "+text+' show confirm dialog');
	// toggleDialog("logDialog", false);
	toggleDialog("deleteDialog", true);
	id('deleteText').innerHTML=text;
});
// CONFIRM DELETE
id('buttonDeleteConfirm').addEventListener('click', function() {
	console.log("delete log - "+logIndex); // confirm delete log
	// NEW CODE...
	console.log('date: '+log.date);
	logs.splice(logIndex,1);
	saveData();
	populateList();
	/* OLD CODE...
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
	*/
	toggleDialog('deleteDialog', false);
});
// SHOW/HIDE DIALOGS
function  toggleDialog(d, visible) {
    console.log('toggle '+d+' - '+visible);
    if(currentDialog) id(currentDialog).style.display='none';
    if(visible) {
    	currentDialog=d;
    	id(d).style.display='block';
    }
}
// OPEN SELECTED LOG FOR EDITING
function openLog() {
	console.log("open log: "+logIndex);
	log=logs[logIndex];
	console.log('log date: '+log.date);
	toggleDialog('logDialog',true);
	id('logDate').value=log.date;
	id('logGrid').value=log.grid;
	id('logPVa').value=log.pvA;
	id('logPVb').value=log.pbB;
	id('logYield').value=log.yield;
	id('logCons').value=log.cons;
	id('buttonDeleteLog').disabled=false;
	id('buttonDeleteLog').style.color='red';
}
// POPULATE LOGS LIST
function populateList() {
	console.log("populate log list");
	logs=[];
	var data=window.localStorage.getItem('logs');
	logs=JSON.parse(data);
	logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
	console.log("populate list with "+logs.length+' logs');
	id('list').innerHTML=""; // clear list
	var html="";
	var d="";
	var mon=0;
  	for(var i=logs.length-1; i>=0; i--) { // list latest first
  		console.log('log '+i+': '+logs[i].grid+'kWh');
  		var listItem=document.createElement('li');
		listItem.index=i;
	 	listItem.classList.add('log-item');
		listItem.addEventListener('click', function(){logIndex=this.index; openLog();});
		var itemText=document.createElement('span');
		d=logs[i].date;
		mon=parseInt(d.substr(5,2))-1;
		mon*=3;
		d=months.substr(mon,3)+" "+d.substr(2,2);
		html='<span class="grey">'+d+'</span><span class="red">'+pad(logs[i].grid)+'</span><span class="green">'+pad(logs[i].pvA)+'</span><span class="yellow">'+pad(logs[i].pvB)+'</span><span class="blue">'+pad(logs[i].yield)+'</span><span class="orange">'+pad(logs[i].cons)+'</span>';
		itemText.innerHTML=html;
		listItem.appendChild(itemText);
		id('list').appendChild(listItem);
  	}
	/* OLD CODE...
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
			console.log("populate list with "+logs.length+' logs');
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
				html='<span class="grey">'+d+'</span><span class="red">'+pad(logs[i].grid)+'</span><span class="green">'+pad(logs[i].pv)+'</span><span class="yellow">'+pad(logs[i].pvB)+'</span><span class="blue">'+pad(logs[i].yield)+'</span><span class="orange">'+pad(logs[i].cons)+'</span>';
				itemText.innerHTML=html;
				listItem.appendChild(itemText);
		  		id('list').appendChild(listItem);
  			}
  		}
	}
	request.onerror=function(event) {
		console.log("cursor request failed");
	}
	*/
}
// DRAW GRAPH
function drawGraph() {
	var letters='JFMAMJJASOND';
	var n=0;
	var margin=90; // bottom margin to allow space for Android controls
	var intervalV=100; // 100kWh interval for horizontal gridlines
	n=logs.length-1;
	console.log('graph spans '+n+' months');
	canvasL=(14-n)*intervalX;
	id('graphPanel').style.left=canvasL+'px';
	id("graphPanel").style.width=(n*intervalX+10)+'px';
	id('canvas').width=n*intervalX+10;
	id('graphPanel').style.display='block';
	id('graphOverlay').style.display='block';
	// clear canvases
	overlay.clearRect(0,0,scr.w,scr.h);
	canvas.clearRect(0,0,id('canvas').width+10,scr.h);
	overlay.fillStyle='black';
	overlay.fillRect(0,0,scr.w,24); // header - black background
	overlay.font='20px Monospace';
	overlay.fillStyle='hotpink';
	overlay.fillText('grid',25,20);
	overlay.fillStyle='lightgreen';
	overlay.fillText('pvA',100,20);
	overlay.fillStyle='yellow';
	overlay.fillText('pvB',150,20);
	overlay.fillStyle='skyblue';
	overlay.fillText('heat',225,20);
	overlay.fillStyle='orange';
	overlay.fillText('ASHP',300,20);
	overlay.lineWidth=1;
	// draw horizontal gridlines and kWh labels on overlay
	for(i=1;i<10;i++) overlay.fillText(i*intervalV,2,scr.h-margin-(i+1)*intervalY-5); // kWh at 100px intervals
	overlay.fillText('kWh',2,scr.h-margin-11*intervalY+20); // vertical axis label
	overlay.strokeStyle='silver'; // grey lines
	overlay.beginPath();
	for(i=1;i<13;i++) {
		overlay.moveTo(0,scr.h-margin-i*intervalY);
		overlay.lineTo(scr.w,scr.h-margin-i*intervalY); // grey lines
	}
	// draw horizontal gridlines for COP graph
	for(i=0;i<6;i++) {
		overlay.moveTo(0,scr.h-margin-intervalY+i*intervalY/5);
		overlay.lineTo(scr.w,scr.h-margin-intervalY+i*intervalY/5); // grey lines
	}
	overlay.stroke();
	// set start log for drawing graphs
	var startLog=1; // defaults to second log (for month intervals)
	var mon=-1;
	var step=1;
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
		canvas.lineTo(x,scr.h-margin-11*intervalY); // vertical gridline
		m=parseInt(logs[i].date.substr(5,2))-1;
		canvas.fillText(letters.charAt(m),x-5,scr.h-margin-11*intervalY-5); // month letter just above and below grid
		canvas.fillText(letters.charAt(m),x-5,scr.h-margin-intervalY-5);
		if(m<1) {
				year=logs[i].date.substr(0,4);
				canvas.fillText(year,x,scr.h-margin-11*intervalY-24); // YYYY above month labels
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
		var y=scr.h-margin-intervalY-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
	}
    canvas.stroke();
    // next draw PVa yield
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
		var y=scr.h-margin-intervalY-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
	}
	canvas.stroke();
	// PVb yield
	console.log('PVb');
	canvas.strokeStyle='yellow';
	canvas.setLineDash([]);
    canvas.beginPath();
    i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    while(i<logs.length) {
    	val=logs[i].pvB-logs[i-step].pvB; // kWh
		val*=intervalY/intervalV; // convert kWh to pixels
		x+=intervalX;
		var y=scr.h-margin-intervalY-val;
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
		var y=scr.h-margin-intervalY-val;
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
		var y=scr.h-margin-intervalY-val;
		if(i==startLog) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		i+=step;
    }
	canvas.stroke();
	// COP graph...
	canvas.fillStyle='black'; // black background
	canvas.fillRect(0,scr.h-margin-intervalY,id('canvas').width+10,intervalY);
	canvas.fillStyle='white';
	canvas.strokeWidth=0;
	canvas.beginPath();
	i=startLog;
    x=(Math.floor(i/step)-1)*intervalX;
    canvas.moveTo(0,scr.h-margin);
    while(i<logs.length) {
    	val=(logs[i].yield-logs[i-step].yield)/(logs[i].cons-logs[i-step].cons); // COP ratio
    	console.log('******* COP: '+val);
		val*=intervalY/5; // convert kWh to pixels
		console.log('******* '+val+' pixels');
		x+=intervalX;
		var y=scr.h-margin-val;
		// if(i==startLog) canvas.moveTo(x,y);
		// else 
		canvas.lineTo(x,y);
		i+=step;
    }
    canvas.lineTo(x,scr.h-margin);
    canvas.closePath();
    canvas.fill();
    overlay.fillText('COP',5,scr.h-margin-intervalY+20);
}
function selectLog() {
	if(currentLog) currentLog.children[0].style.backgroundColor='gray'; // deselect any previously selected item
    itemIndex=parseInt(logIndex);
	log=logs[logIndex];
	console.log("selected item: "+logIndex);
	currentLog=id('list').children[logIndex];
	currentLog.style.backgroundColor='black'; // highlight new selection
}
// DATA
id('backupButton').addEventListener('click',function() {toggleDialog('dataDialog',false); backup();});
id('importButton').addEventListener('click',function() {toggleDialog('importDialog',true)});
// UPDATE LOG STORE
function saveData() {
	console.log('save '+logs.length+' logs');
	var data=JSON.stringify(logs);
	console.log('log data: '+data);
	window.localStorage.setItem('logs',data);
	console.log('logs store updated');
	// alert(logs.length+' logs saved');
}
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
    	var logs=JSON.parse(data);
    	console.log(logs.length+" logs loaded");
    	// NEW CODE...
    	saveData();
    	/* OLD CODE...
    	var dbTransaction=db.transaction('logs',"readwrite");
    	console.log('database ready - save '+logs.length+' logs');
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	for(var i=0;i<logs.length;i++) {
    		console.log("add log "+i);
    		// deal with legacy 'solar' values (thermal solar)
    		if(logs[i].solar) {
    			logs[i].pvB=0;
    			logs[i].solar=null;
    		}
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
    	*/
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
  	var fileName="LevelsData.json";
  	// NEW CODE...
  	var json=JSON.stringify(logs);
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
  	/* OLD CODE...
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
		}
	}
	*/
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
// NEW CODE...
populateList();
/* OLD CODE...
var request=window.indexedDB.open("LevelsDB",2);
request.onsuccess=function(event) {
    db=event.target.result;
    var dbTransaction=db.transaction('logs',"readwrite");
    var dbObjectStore=dbTransaction.objectStore('logs');
    logs=[];
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
        	
        	// NEW LOG DATA
        	log={};
        	log.date=cursor.value.date;
        	log.grid=cursor.value.grid;
        	log.pvA=cursor.value.pv;
        	log.pvB=cursor.value.pvB;
        	log.yield=cursor.value.yield;
        	log.cons=cursor.value.cons;
        	logs.push(log);
		    // logs.push(cursor.value);
		    
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
		    
		    // CREATE NEW DATA STORE
		    saveData();
		    
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
*/
// implement service worker if browser is PWA friendly 
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('sw.js', {
		scope: '/Levels/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
