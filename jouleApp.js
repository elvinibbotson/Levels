function id(el) {
	// console.log("return element whose id is "+el);
	return document.getElementById(el);
}

function pad(n) {
	console.log('pad '+n+' to 5 chars - starting from '+n.length);
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
var view='list';
var dragStart={};
var canvas=null;
var overlay=null;
var canvasL=0;
var monthW=0;
var kWh=0;
var lastSave=-1;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";

// EVENT LISTENERS

// DRAG TO GO BACK
document.body.addEventListener('touchstart', function(event) {
    console.log(event.changedTouches.length+" touches");
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    console.log('start drag at '+dragStart.x+','+dragStart.y+' view is '+view);
})

document.body.addEventListener('touchmove', function(event) {
	var x=event.changedTouches[0].clientX-dragStart.x;
	x+=canvasL;
	id('graphPanel').style.left=x+'px';
})

document.body.addEventListener('touchend', function(event) {
    var drag={};
    drag.x=dragStart.x-event.changedTouches[0].clientX;
    drag.y=dragStart.y-event.changedTouches[0].clientY;
    console.log('drag '+drag.x+','+drag.y+' view is '+view);
    if(view=='list') {
    	if(Math.abs(drag.y)>50) return; // ignore vertical drags
    	if(Math.abs(drag.x)>50) {
    		// alert("show graph view");
    		view='graph';
    		id('listPanel').style.display='none';
    		id('heading').style.display='none';
    		drawGraph();
    	}
    }
    else {
    	canvasL-=drag.x;
    	if(Math.abs(drag.x)>50) return; // ignore horizontal drags
    	if(Math.abs(drag.y)>50) {
    		// alert("show list view");
    		view='list';
    		id('graphPanel').style.display='none';
    		id('graphOverlay').style.display='none';
    		id('listPanel').style.display='block';
    		id('heading').style.display='block';
    		// populateList();
    	}
    }
})

// TAP ON HEADER
id('heading').addEventListener('click',function() {toggleDialog('dataDialog',true);})

// NEW BUTTON
id('buttonNew').addEventListener('click', function() { // show the log dialog
	console.log("show add jotting dialog with today's date, 1 day duration, blank text field and delete button disabled");
    toggleDialog('logDialog',true);
	var d=new Date().toISOString();
	id('logDate').value=d.substr(0,10);
	id('logGrid').value=null;
	id('logPV').value=null;
	id('logYield').value=null;
	id('logCons').value=null;
	id('logSolar').value=null;
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
	log.yield=id('logYield').value;
	log.cons=id('logCons').value;
	log.solar=id('logSolar').value;
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

// CANCEL NEW/EDIT LOG
id('buttonCancelLog').addEventListener('click', function() {
    toggleDialog('logDialog',false); // close add new jotting dialog
});
  
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

// CANCEL DELETE
id('buttonCancelDelete').addEventListener('click', function() {
    toggleDialog('deleteDialog', false); // close delete dialog
});

// SHOW/HIDE DIALOGS
function  toggleDialog(d, visible) {
    console.log('toggle '+d+' - '+visible);
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
}

// OPEN SELECTED LOG FOR EDITING
function openLog() {
	console.log("open log: "+logIndex);
	log=logs[logIndex];
	toggleDialog('logDialog',true);
	id('logDate').value=log.date;
	id('logGrid').value=log.grid;
	id('logPV').value=log.pv;
	id('logYield').value=log.yield;
	id('logCons').value=log.cons;
	id('logSolar').value=log.solar;
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
				html=d+' <span class="blue">'+pad(logs[i].grid)+'</span><span class="green">'+pad(logs[i].pv)+'</span><span class="plum">'+pad(logs[i].yield)+'</span><span class="orange">'+pad(logs[i].cons)+'</span><span class="yellow">'+pad(logs[i].solar)+'</span>';
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
function drawGraph() {
	console.log('GRAPH');
	var letters='JFMAMJJASOND';
	// start from second month, logging kWh between month ends
	var firstMonth=parseInt(logs[1].date.substr(2,2)*12)+parseInt(logs[1].date.substr(5,2))-1;
	var lastMonth=parseInt(logs[logs.length-1].date.substr(2,2))*12+parseInt(logs[logs.length-1].date.substr(5,2))-1;
	var n=lastMonth-firstMonth;
	console.log('graph spans months '+firstMonth+'-'+lastMonth);
	id("graphPanel").style.width=n*monthW+'px';
	id("canvas").width=n*monthW;
	canvasL=(14-n)*monthW;
	console.log('screen width: '+scr.w+'; '+logs.length+'logs; canvasL is '+canvasL+'; width is '+id('canvas').width);
	id('graphPanel').style.left=canvasL+'px';
	id('graphPanel').style.display='block';
	id('graphOverlay').style.display='block';
	var margin=120; // bottom margin
	// first draw grid power usage
	canvas.strokeStyle='skyblue';
	canvas.lineWidth=3;
	canvas.beginPath();
	for(var i=1;i<logs.length;i++) {
		var val=logs[i].grid-logs[i-1].grid; // kWh for month
		var x=(i-1)*monthW;
		var y=id('canvas').height-margin-val*kWh;
		if(i<2) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		console.log('blue '+i+' at '+x+','+y);
	}
    canvas.stroke();
    // next draw PV yield
    canvas.strokeStyle='lightgreen';
    canvas.beginPath();
	for(var i=1;i<logs.length;i++) { 
		val=logs[i].pv-logs[i-1].pv; // kWh for month
		x=(i-1)*monthW;
		y=id('canvas').height-margin-val*kWh;
		if(i<2) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		console.log('green '+i+' at '+x+','+y);
	}
	canvas.stroke();
	// heat pump yield...
	canvas.strokeStyle='plum';
    canvas.beginPath();
	for(var i=1;i<logs.length;i++) { 
		val=logs[i].yield-logs[i-1].yield; // kWh for month
		x=(i-1)*monthW;
		y=id('canvas').height-margin-val*kWh;
		if(i<2) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		console.log('plum '+i+' at '+x+','+y);
	}
	canvas.stroke();
	// heat pump unput
	canvas.strokeStyle='orange';
    canvas.beginPath();
	for(var i=1;i<logs.length;i++) { 
		val=logs[i].cons-logs[i-1].cons; // kWh for month
		x=(i-1)*monthW;
		y=id('canvas').height-margin-val*kWh;
		if(i<2) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		console.log('orange '+i+' at '+x+','+y);
	}
	canvas.stroke();
	// thermal solar yield
	canvas.strokeStyle='yellow';
    canvas.beginPath();
	for(var i=1;i<logs.length;i++) { 
		val=logs[i].solar-logs[i-1].solar; // kWh for month
		x=(i-1)*monthW;
		y=id('canvas').height-margin-val*kWh;
		if(i<2) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
		console.log('yellow '+i+' at '+x+','+y);
	}
	canvas.stroke();
	// then draw kWh and months along axes
	overlay.font='20px Monospace';
	overlay.fillStyle='skyblue';
	overlay.fillText('grid',25,20);
	overlay.fillStyle='lightgreen';
	overlay.fillText('PV',100,20);
	overlay.fillStyle='plum';
	overlay.fillText('yield',150,20);
	overlay.fillStyle='orange';
	overlay.fillText('input',225,20);
	overlay.fillStyle='yellow';
	overlay.fillText('solar',300,20);
	overlay.fillStyle='white';
	overlay.lineWidth=1;
	y=(scr.h-margin)/15; // 100kWh intervals - px
	for(i=0;i<13;i++) overlay.fillText(i*100,0,scr.h-margin-i*100*kWh); // kWh
	// for(i=0;i<15;i++) overlay.fillText(i*100,-1*canvasL,scr.h-margin-i*100*kWh); // 0-1500 (kWh)
	overlay.strokeStyle='silver';
	overlay.beginPath();
	for(i=0;i<15;i++) {
		overlay.moveTo(0,scr.h-margin-i*100*kWh);
		overlay.lineTo(scr.w,scr.h-margin-i*100*kWh); // grey lines
		// canvas.lineTo(id('canvas').width,scr.h-margin-i*100*kWh); // grey lines
	}
	overlay.stroke();
	canvas.font='20px Monospace';
	canvas.fillStyle='white';
	for(var i=1;i<logs.length;i++) {
		x=(i-1)*monthW;
		var m=parseInt(logs[i].date.substr(5,2))-1;
		canvas.fillText(letters.substr(m,1),x,scr.h-margin+40); // month letter
		if(m<1) {
			var year=logs[i].date.substr(0,4);
			canvas.fillText(year,x,scr.h-margin+20); // YYYY
		}
	}
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
id('dataCancelButton').addEventListener('click',function() {toggleDialog('dataDialog',false)});

// IMPORT FILE
id("fileChooser").addEventListener('change',function() {
    var file=id('fileChooser').files[0];
    // alert("file: "+file+" name: "+file.name);
    /*
    var fileReader=new FileReader();
    fileReader.addEventListener('load', function(evt) {
	    console.log("file read: "+evt.target.result);
    	var data=evt.target.result;
    	var json=JSON.parse(data);
    	console.log("json: "+json);
    	var logs=json.logs;
    	console.log(logs.length+" logs loaded");
    	var dbTransaction=db.transaction('logs',"readwrite");
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	for(var i=0;i<logs.length;i++) {
    		console.log("add log "+i);
    		var request = dbObjectStore.add(logs[i]);
    		request.onsuccess = function(e) {
    			console.log(logs.length+" logs added to database");
    		};
    		request.onerror = function(e) {console.log("error adding log");};
    	}
    	toggleDialog('importDialog',false);
    	alert("logs imported - restart");
    });
    fileReader.readAsText(file);
    */
});
id('confirmImport').addEventListener('click',function(event) {
	var file=id('fileChooser').files[0];
    // alert("read file: "+file+" name: "+file.name);
    var fileReader=new FileReader();
    fileReader.onload=function() {
    	var data=fileReader.result;
    	console.log('file read');
    	var json=JSON.parse(data);
    	alert("json: "+json);
    	var logs=json.logs;
    	// alert(logs.length+" logs loaded");
    	var dbTransaction=db.transaction('logs',"readwrite");
    	var dbObjectStore=dbTransaction.objectStore('logs');
    	alert('database ready - save '+logs.length+' logs');
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
    		alert("logs imported - restart");
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
	fileName+=(date.getMonth()+1);
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
			alert(fileName+" saved to downloads folder");
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
monthW=scr.w/14; // 14 months visible in graph
kWh=scr.h/1500; // graph height equivalent to 1500kW 
console.log('monthW: '+monthW+'px');
id("canvas").width=scr.w;
id("canvas").height=scr.h;
console.log('canvas size: '+id("canvas").width+'x'+id("canvas").height);
id("overlay").width=scr.w;
id("overlay").height=scr.h;
canvas=id('canvas').getContext('2d');
overlay=id('overlay').getContext('2d');
lastSave=window.localStorage.getItem('jouleSave'); // get month of last backup
console.log('lastSave: '+lastSave);
var request=window.indexedDB.open("jouleDB");
request.onsuccess=function(event) {
    db=event.target.result;
    console.log("DB open");
    var dbTransaction=db.transaction('logs',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('logs');
    console.log("indexedDB objectStore ready");
    // code to read logs from database
    logs=[];
    console.log("logs array ready");
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
	var dbObjectStore = event.currentTarget.result.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
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
