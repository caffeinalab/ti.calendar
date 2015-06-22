
var args = arguments[0] || {};
var Moment = require('alloy/moment');

_.defaults(args, {

	day: Moment().date(),
	month: Moment().month(),
	year: Moment().year(),
	active_dates: [],

	backgroundColor: 'transparent',
	dateBackgroundColor: '#6000',
	todayBackgroundColor: '#af80',
	dateTextColor: '#fff',
	todayTextColor: '#000',
	activePinColor: 'orange',
	inactivePinColor: 'transparent',
	selectedBackgroundColor: '#6f80'

});

var active_dates = args.active_dates ? getMomentDates(args.active_dates) : [];
var current_page = 0;

/////////////
// Methods //
/////////////

function getDayLabels() {
	var days = Moment.weekdaysShort();
	days.push(days.shift()); // Moment week has Sunday at index 0
	_.each(days, function(day) {
		var $view = $.UI.create('View', {
			classes: ['dayLabelView'],
			width: Math.floor($.calendar.rect.width / 7)
		});
		$view.add($.UI.create('Label', {
			classes: ['dayLabel'],
			text: day
		}));

		$.dayLabelsRow.add($view);
	});
}

function getMomentDates(dates) {
	return _.map(dates, function(date) {
		return Moment(date);
	});
}

function isInMomentsList(date, dates) {
	return _.find(dates, function(day) {
		return date.isSame(day);
	});
}

function getDayView(date, current, active) {
	var is_today = date.isSame(Moment(), 'day');
	var $this = $.UI.create('View', {
		classes: ['day'],
		width: Math.floor($.calendar.rect.width / 7),
		backgroundColor: is_today ? args.todayBackgroundColor : args.dateBackgroundColor,
		opacity: current ? 1 : 0.5,
		date: date,
		active: active,
	});
	$this.add($.UI.create('Label', {
		classes: ['dayNumber'],
		color: is_today ? args.todayTextColor : args.dateTextColor,
		text: date.date()
	}));
	$this.add($.UI.create('View', {
		classes: ['dayDot'],
		backgroundColor: active ? args.activePinColor : args.inactivePinColor
	}));

	return $this;
}

function getDayContainer(number) {
	var $this = $.UI.create('View', {
		classes: ['day'],
		width: Math.floor($.calendar.rect.width / 7),
		backgroundColor: '#6000',
		opacity: 1,
		date: null,
		active: null,
	});
	$this.add($.UI.create('Label', {
		classes: ['dayNumber'],
		color: '#fff',
		text: number
	}));
	$this.add($.UI.create('View', {
		classes: ['dayDot'],
		backgroundColor: 'transparent'
	}));

	return $this;
}

function setItemDate($item, date) {
	$item.date = date;
	$item.children[0].text = date.date();
}

function setItemActive($item, active) {
	$item.active = active;
	$item.children[1].backgroundColor = active ? 'orange' : 'transparent';
}

function setItemToday($item, is_today) {
	$item.backgroundColor = is_today ? '#9f80' : '#6000';
}

function setItemCurrent($item, current) {
	$item.opacity = current ? 1 : 0.5;
}

function getMonthView(month, year) {
	var month_rows = [];
	var num_cols = 7;
	var num_rows = 5;
	var start_date = Moment().month(month).year(year).startOf('month').startOf('week');

	var $month_view = $.UI.create('View', {
		classes: ['month'],
		month: month,
		year: year,
		backgroundColor: args.backgroundColor,
		ready: false
	});

	return $month_view;
}

function buildMonth($month_view, dates) {
	if ($month_view.ready) return;
	Ti.API.debug('buildMonth start');
	var month_rows = [];
	var num_cols = 7;
	var num_rows = 5;
	var start_date = Moment().month($month_view.month).year($month_view.year).startOf('month').startOf('week');

	for (var i = 0; i < num_rows; i++) {
		month_rows.push($.UI.create('View', {
			classes: ['monthRow']
		}));
	}

	// Add day containers
	for (var d = 0; d < num_rows*num_cols; d++) {
		var curday = Moment(start_date).add(d, 'days');
		var $curview = getDayContainer(curday.date());

		setItemDate($curview, curday);
		setItemActive($curview, isInMomentsList(curday, dates));
		setItemCurrent($curview, curday.month() === $month_view.month);
		setItemToday($curview, curday.isSame(Moment(), 'day'));

		month_rows[Math.floor(d/num_cols)].add($curview);
	}

	// Add rows
	_.each(month_rows, function(row) {
		$month_view.add(row);
	});

	$month_view.ready = true;

	Ti.API.debug('buildMonth end');
}

function buildCalendar() {
	$.main.removeEventListener('postlayout', buildCalendar);

	// Add top labels
	getDayLabels();
	// Create the calendar views
	for (var m = 0; m < 12; m++) {
		$.monthScroll.addView(getMonthView(m, args.year));
	}
	current_page = args.month;

	setCurrentMonth(args.month);
	if (args.month - 1 > -1) buildMonth($.monthScroll.views[args.month-1], args.active_dates);
	if (args.month + 1 < 12) buildMonth($.monthScroll.views[args.month+1], args.active_dates);
}

function setCurrentMonth(m) {
	$.monthScroll.currentPage = m;
	$.monthName.text = Moment().month($.monthScroll.views[m].month).year($.monthScroll.views[m].year).format('MMMM YYYY');
	buildMonth($.monthScroll.views[m], args.active_dates);
}

///////////////
// Listeners //
///////////////

$.main.addEventListener('postlayout', buildCalendar);

$.monthScroll.addEventListener('scroll', function(e) {
	if (e.currentPage === current_page) return;
	var old_page = current_page;
	current_page = e.currentPage;

	// Genereate the adjacent views
	if (current_page > old_page) {
		buildMonth($.monthScroll.views[current_page+1], args.active_dates);
	} else {
		buildMonth($.monthScroll.views[current_page-1], args.active_dates);
	}

	// Build the new month
	$.monthName.text = Moment().month($.monthScroll.views[e.currentPage].month).year($.monthScroll.views[e.currentPage].year).format('MMMM YYYY');
	buildMonth(e.view, args.active_dates);
});
