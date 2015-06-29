
var args = arguments[0] || {};
var Moment = require('alloy/moment');

var ROWS = 6;
var COLUMNS = 7;

_.defaults(args, {

	current_date: Moment(),
	active_dates: [],
	min_date: Moment().subtract(6, 'months'),
	max_date: Moment().add(6, 'months'),

	backgroundColor: 'transparent',
	dateBackgroundColor: 'transparent',
	todayBackgroundColor: '#af80',
	dateTextColor: '#fff',
	todayTextColor: '#000',
	activePinColor: '#f39911',
	inactivePinColor: 'transparent',
	selectedBackgroundColor: '#60f39911',

	allowInactiveSelection: 'false',
	fillMonth: 'false'

});

var active_dates = args.active_dates ? getMomentDates(args.active_dates) : [];
var current_page = 0;

/////////////
// Methods //
/////////////

function getDayLabels() {
	var days = Moment.weekdaysMin();
	days.push(days.shift()); // Moment week has Sunday at index 0
	_.each(days, function(day, i) {
		var width = Math.floor($.calendar.rect.width / COLUMNS);
		var $label = $.UI.create('Label', {
			classes: ['dayLabel'],
			width: width,
			text: day.charAt(0),
			left: i * width
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

function getDayContainer(number) {
	var $this = $.UI.create('View', {
		classes: ['day'],
		width: Math.floor($.monthScroll.rect.width / COLUMNS),
		height: Math.floor($.monthScroll.rect.height / ROWS),
		backgroundColor: args.dateBackgroundColor,
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
	$item.children[1].backgroundColor = active ? args.activePinColor : args.inactivePinColor;
}

function setItemToday($item, is_today) {
	$item.backgroundColor = is_today ? args.todayBackgroundColor : args.dateBackgroundColor;
	$item.children[0].color = is_today ? args.todayTextColor : args.dateTextColor;
}

function setItemCurrent($item, current) {
	$item.opacity = current ? 1 : 0.5;
}

function getMonthView(month, year) {
	var month_rows = [];
	var start_date = Moment().month(month).year(year).startOf('month').startOf('week');
	var end_date = Moment().month(month).year(year).endOf('month').endOf('week');

	// Month skeleton
	var $month_view = $.UI.create('View', {
		classes: ['month'],
		month: month,
		year: year,
		backgroundColor: args.backgroundColor,
		ready: false
	});

	// Month activity indicator
	var $loader = Ti.UI.createActivityIndicator({
		style: OS_IOS ? Ti.UI.iPhone.ActivityIndicatorStyle.BIG : Ti.UI.ActivityIndicatorStyle.BIG,
		center: {
			x: '50%',
			y: '50%'
		}
	});
	$month_view.add($loader);
	$month_view.__loader = $loader;
	$loader.show();

	return $month_view;
}

function buildMonth($month_view, dates) {
	if (!$month_view || $month_view.ready) return;
	var start_date = Moment().month($month_view.month).year($month_view.year).startOf('month').startOf('week');
	var end_date = Moment().month($month_view.month).year($month_view.year).endOf('month').endOf('week');
	var $days_container = Ti.UI.createView({
		height: Ti.UI.FILL,
		width: Ti.UI.FILL
	});

	// Separators
	for (var i = 0; i < ROWS; i++) {
		$days_container.add($.UI.create('View', {
			classes: ['hr'],
			top: (i+1) * Math.floor($.monthScroll.rect.height / ROWS)
		}));
	}

	// Add day containers
	for (var d = 0; d < ROWS*COLUMNS; d++) {
		var curday = Moment(start_date).add(d, 'days');
		// If fillMonth is disabled, add only this month's days
		if (curday.month() === $month_view.month || args.fillMonth == true) {
			var $curview = getDayContainer(curday.date());
			var row = Math.floor(d/COLUMNS);
			var col = d % COLUMNS;

			setItemDate($curview, curday);
			setItemActive($curview, isInMomentsList(curday, dates));
			setItemCurrent($curview, curday.month() === $month_view.month);
			setItemToday($curview, curday.isSame(Moment(), 'day'));

			$curview.top = row * ($curview.height);
			$curview.left = col * ($curview.width);

			$days_container.add($curview);
		}
	}

	$month_view.add($days_container);
	$month_view.ready = true;
	$month_view.__loader.hide();
}

function buildCalendar() {
	$.main.removeEventListener('postlayout', buildCalendar);

	// Add top labels
	getDayLabels();
	// Create the calendar views
	var curmonth_index = -1; var i = 0;
	for (var m = Moment(args.min_date); m.diff(Moment(args.max_date)) <= 0; m.add(1, 'months')) {
		if (m.isSame(Moment(), 'month')) curmonth_index = i;
		var monthview = getMonthView(m.month(), m.year());
		$.monthScroll.addView(monthview);
		i++;
	}

	$.monthScroll.currentPage = current_page = curmonth_index > 0 ? curmonth_index : 0;
	refreshCalendarMonth(current_page);
}

function refreshCalendarMonth(m) {
	var month_date = Moment().month($.monthScroll.views[m].month).year($.monthScroll.views[m].year);
	
	$.monthName.text = month_date.format('MMMM').toUpperCase();
	$.monthYear.text = month_date.format('YYYY');

	buildMonth($.monthScroll.views[m], args.active_dates);

	if (current_page - 1 > -1) buildMonth($.monthScroll.views[m-1], args.active_dates);
	if (current_page + 1 < 12) buildMonth($.monthScroll.views[m+1], args.active_dates);
}

///////////////
// Listeners //
///////////////

$.main.addEventListener('postlayout', buildCalendar);

$.monthScroll.addEventListener('scroll', function(e) {
	if (e.currentPage === current_page) return;
	current_page = e.currentPage;
	refreshCalendarMonth(current_page);
});

$.monthScroll.addEventListener('click', function(e) {
	if (!e.source.date || (!e.source.active && args.allowInactiveSelection)) return;

	e.source.animate({ backgroundColor: args.selectedBackgroundColor, duration: 150, autoreverse: true });

	$.trigger('selected', {
		date: e.source.date,
		active: e.source.active
	});
});

$.leftBtn.addEventListener('click', function() {
	$.monthScroll.movePrevious();
});

$.rightBtn.addEventListener('click', function() {
	$.monthScroll.moveNext();
});
