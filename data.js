var Observable = require("FuseJS/Observable")
var FileSystem = require("FuseJS/FileSystem")
var Moment = require("Library/moment")

var currentDate = Observable(Moment())
exports.currentDate = currentDate

var defns = Observable()
exports.defns = defns

/*this is used as an event generator, anything that might require the tasks to update 
will increment this value. Listeners can observe changes to respond. */
var tasksVersion = Observable(0)
exports.tasksVersion = tasksVersion

var defnMap = {}

exports.getDefn = function(id) {
	if (id in defnMap) {
		return defnMap[id]
	}
	
	return Observable()
}

var Period = Object.freeze({
	Daily: "daily",
	Weekly: "weekly",
	Monthly: "monthly",
})

exports.addActivity = function( otask ) {
	otask.value.activity.add( Moment() )
	modifiedDefn(otask.value)
}

exports.deleteDefn = function( odefn ) {
	var defn = odefn.value
	defn.deleted = true
	delete defnMap[defn.id]
	if (defns.contains(odefn)) { //it always should
		defns.remove(odefn)
	}
	
	var fname = getDefnFilename(defn)
	console.log( "Deleting " + fname )
	FileSystem.delete( fname )
	updateTasks()
}

function updateTasks() {
	//set current values for definitions
	defns.forEach( function(odefn) {
		var defn = odefn.value
		defn.remain.value = defn.count - defn.activity.length
	})

	//inform listeners
	tasksVersion.value += 1
}

var anyDefnDirty = false
function modifiedDefn(defn) {
	if (!defn) {
		return
	}

	modifiedSingleDefn(defn)
	endModifiedDefn()
}
exports.modifiedDefn = modifiedDefn

function modifiedSingleDefn(defn) {
	defn.version +=1
	anyDefnDirty = true
}
function endModifiedDefn() {
	if (anyDefnDirty) {
		anyDefnDirty = false
		updateTasks()
		//give a slight bit of time to accumulate changes before saving them all (don't go too high though since the user will expect immediate persistence)
		setTimeout( saveAll, 1000 )
	}
}

var maxId = 0

exports.newDefn = function() {
	var id = ++maxId
	return createDefn({
		id: id,
		name: "",
		desc: "",
		period: Period.Daily,
		periodStep: 1,
		count: 1,
		icon: "\u{1F514}",
	})
}


var tasksPath = FileSystem.dataDirectory + "/tasks"
if (!FileSystem.existsSync(tasksPath)) {
	FileSystem.createDirectorySync(tasksPath)
}

function getDefnFilename( defn ) {
	return tasksPath + "/defn_" + defn.id
}

/**
	Saves all outdated definitions.
*/
function saveAll() {
	defns.forEach( function(d) {
		var defn = d.value
		if (defn.version == defn.savedVersion) {
			return
		}
		
		var name = getDefnFilename(defn)
		var stripDerived = function(key, value) {
			if (key == "activity" ) {
				return stripObservable(value)
			} 
			if (value instanceof Observable) {
				return undefined
			}
			if (value instanceof Moment || value instanceof Date) {
				return value.toISOString()
			}
			return value
		}
		
		var data = JSON.stringify( defn, stripDerived, "\t" )
		console.log( "Saving " + defn.name + "#" + defn.id )
		FileSystem.writeTextToFileSync(name, data)
		defn.savedVersion = defn.version
	})
}
exports.saveAll = saveAll

function stripObservable(o) {
	var out = []
	o.forEach( function(d) {
		out.push(d)
	})
	return out
}

function basename(path) {
	return path.replace(/^.*[\\\/]/, '')
}

function startsWith(str, sub) {
	return str.lastIndexOf(sub, 0) === 0
}

function loadData() {
	var files = FileSystem.listFilesSync( tasksPath )
	files.forEach( function(f) {
		var base = basename(f)
		if (startsWith(base,"defn_")) {
			loadDefn(f)
		} else {
			console.log( "Unrecognized data: " + f )
		}
	})
	updateTasks()
}

function loadDefn(f) {
	try {
		var data = FileSystem.readTextFromFileSync(f)
		var obj = JSON.parse(data)
		var defn = createDefn(obj)
		defn.value.savedVersion = defn.value.version
		maxId = Math.max(maxId, defn.value.id)

	} catch( e ) {
		console.log( "" + e )
		console.log( "Cannot load file: " + f )
	}
}

exports.sampleData = function() {
	var fixedDefns = [{
		id: ++maxId,
		name: "Pay Bills",
		desc: "Mindnumbingly work through the stack",
		period: Period.Monthly,
		periodStep: 1,
		count: 1,
		icon: "\u{1F4B6}",
	}, {
		id: ++maxId,
		name: "Go for a ride",
		desc: "Take the bike out for and hour or so",
		period: Period.Weekly,
		periodStep: 1,
		count: 2,
		icon: "\u{1F6B4}",
	}, {
		id: ++maxId,
		name: "Investments",
		desc: "Check the state of the investments",
		period: Period.Weekly,
		periodStep: 2,
		count: 1,
		icon: "\u{1F4B0}",
	}, {
		id: ++maxId,
		name: "Yoga",
		desc: "Play the human puppet for a while",
		period: Period.Daily,
		periodStep: 1,
		count: 1,
		//icon: "\u{1F9D8}",
		icon: "\u{1F483}",
	}]

	fixedDefns.forEach( function(v) {
		var activity = Observable()
		var defn = createDefn(v)
		maxId = Math.max( v.id, maxId )
	})
	updateTasks()
}

function createDefn(data) {
	//TODO: handle format errors
	var cact = (data.activity || []).map( function(v) {
		return Moment(v, Moment.ISO_8601)
	})
	data.activity = Observable()
	data.activity.replaceAll(cact)
	
	data.remain = Observable(0)
	
	//version will track if we need to save this object again
	data.version = 1
	data.savedVersion = 0
	var defn = Observable(data)
	
	defnMap[data.id] = defn
	//TODO: check if already exists
	defns.add(defn)
	return defn
}

exports.setDate = function(nextDate) {
	currentDate.value = nextDate
	cleanDefns(currentDate.value)
	updateTasks()
}

function cleanDefns(date) {
	defns.forEach( function(odefn) {
		var updated = cleanDefn(odefn.value, date)
		if (updated) {
			modifiedSingleDefn(odefn.value)
		}
	})
	
	endModifiedDefn()
}

/**
	removes stale activity dates from the task
*/
function cleanDefn(defn, date) {
	var anyUpdated = false
	
	for (var i=defn.activity.length-1; i >=0; i--) {
		var ad = defn.activity.getAt(i)
		
		var remove = true
		switch (defn.period) {
			case Period.Daily:
				remove = date.day() > ad.day() ||
					date.week() > ad.week() ||
					date.month() > ad.month() ||
					date.year() > ad.year();
				break;
				
			case Period.Weekly:
				remove = date.week() > ad.week() ||
					date.month() > ad.month() ||
					date.year() > ad.year();
				break;
				
			case Period.Monthly:
				remove = date.month() > ad.month() ||
					date.year() > ad.year();
				break;
		}
		
		if (remove) {
			defn.activity.removeAt(i)
			anyUpdated = true
		}
	}
	
	return anyUpdated
}

exports.init = function(busy) {
	try {
		loadData()
	} catch( e ) {
		//ensure whatever happens that...
		console.log( "" + e )
	}
	//...we aren't busy anymore
	busy.deactivate()
}
