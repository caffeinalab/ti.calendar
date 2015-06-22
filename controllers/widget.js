
var args = arguments[0] || {};
var Moment = require('alloy/moment');

_.defaults(args, {

	current_date: Moment(),
	active_dates: [],
	min_date: Moment().subtract(6, 'months'),
	max_date: Moment().add(6, 'months'),

	backgroundColor: 'transparent',
	dateBackgroundColor: '#6000',
	todayBackgroundColor: '#af80',
	dateTextColor: '#fff',
	todayTextColor: '#000',
	activePinColor: 'orange',
	inactivePinColor: 'transparent',
	selectedBackgroundColor: '#60f39911',

	allowInactiveSelection: 'false'

});

var active_dates = args.active_dates ? getMomentDates(args.active_dates) : [];
var current_page = 0;

/////////////
// Methods //
/////////////

function getDayLabels() {
	var days = Moment.weekdaysShort();
	days.push(days.shift()); // Moment week has Sunday at index 0
	_.each(days, function(day, i) {
		var width = Math.floor($.calendar.rect.width / 7);
		var $label = $.UI.create('Label', {
			classes: ['dayLabel'],
			width: width,
			text: day,
			left: i * (width + 1)
		});

		$.dayLabels.add($label);
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
	if (!$month_view || $month_view.ready) return;
	var num_cols = 7;
	var num_rows = 5;
	var start_date = Moment().month($month_view.month).year($month_view.year).startOf('month').startOf('week');
	var $days_container = Ti.UI.createView({
		height: Ti.UI.SIZE,
		width: Ti.UI.SIZE
	});

	// Add day containers
	for (var d = 0; d < num_rows*num_cols; d++) {
		var curday = Moment(start_date).add(d, 'days');
		var $curview = getDayContainer(curday.date());
		var row = Math.floor(d/num_cols);
		var col = d % num_cols;

		setItemDate($curview, curday);
		setItemActive($curview, isInMomentsList(curday, dates));
		setItemCurrent($curview, curday.month() === $month_view.month);
		setItemToday($curview, curday.isSame(Moment(), 'day'));

		$curview.top = row * ($curview.height + 1);
		$curview.left = col * ($curview.width + 1);

		$days_container.add($curview);
	}

	$month_view.add($days_container);
	$month_view.ready = true;
}

function buildCalendar() {
	$.main.removeEventListener('postlayout', buildCalendar);

	// Add top labels
	getDayLabels();
	// Create the calendar views
	var curmonth_index = -1; var i = 0;
	for (var m = Moment(args.min_date); m < Moment(args.max_date); m.add(1, 'months')) {
		if (m.isSame(Moment(), 'month')) curmonth_index = i;
		$.monthScroll.addView(getMonthView(m.month(), m.year()));
		i++;
	}

	setCurrentMonth(curmonth_index || Math.floor($.monthScroll.views.length / 2));
	if (args.current_date.month() - 1 > -1) buildMonth($.monthScroll.views[args.current_date.month()-1], args.active_dates);
	if (args.current_date.month() + 1 < 12) buildMonth($.monthScroll.views[args.current_date.month()+1], args.active_dates);
}

function setCurrentMonth(m) {
	$.monthScroll.currentPage = current_page = m;
	$.monthName.text = Moment().month($.monthScroll.views[m].month).year($.monthScroll.views[m].year).format('MMMM YYYY');
	buildMonth($.monthScroll.views[m], args.active_dates);
}

///////////////
// Listeners //
///////////////

$.main.addEventListener('postlayout', buildCalendar);

$.monthScroll.addEventListener('scroll', function(e) {
	if (e.currentPage === current_page) return;
	$.monthName.text = Moment().month(e.view.month).year(e.view.year).format('MMMM YYYY');

	var old_page = current_page;
	current_page = e.currentPage;

	// Genereate the adjacent views
	if (current_page > old_page) {
		buildMonth($.monthScroll.views[current_page+1], args.active_dates);
	} else {
		buildMonth($.monthScroll.views[current_page-1], args.active_dates);
	}

	// Build the new month
	buildMonth(e.view, args.active_dates);
});

$.monthScroll.addEventListener('click', function(e) {
	if (!e.source.date || (!e.source.active && args.allowInactiveSelection)) return;

	e.source.animate({ backgroundColor: args.selectedBackgroundColor, duration: 150, autoreverse: true });

	$.trigger('selected', {
		date: e.source.date,
		active: e.source.active
	});
});
