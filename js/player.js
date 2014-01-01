(function (window) {
    var Player = function ($container, meta, data) {
        var me = this;
        this.onPlay = function () {
            $container.find('#play-button-mini .glyphicon')
                .removeClass('glyphicon-play')
                .addClass('glyphicon-pause');
            $container.find('#progress-bar').addClass('active');
            me.term._blinker = function () {
                me.term._cursorBlink();
            };
            me.term.startBlink();
            Terminal.prototype.blur = function () {
            };
            Terminal.focus = me.term;
            $container.find('#play-button-overlay').hide();
            $container.find('#pause-alert').fadeOut();
        };
        this.onStop = function () {
            if (this.status == 0) {
                $container.find('#play-button-overlay').show();
            }
            $container.find('#play-button-mini .glyphicon')
                .removeClass('glyphicon-pause')
                .addClass('glyphicon-play');
            $container.find('#progress-bar').removeClass('active');
            me.term._blinker = function () {
            };
            me.term.refreshBlink();
            if (me.term.cursorState != 0) {
                me.term._cursorBlink();
            }
        };
        this.onProgress = function (p) {
            $container.find('.progress-bar').css('width', p + '%');
        };
        $container.find('#play-button-mini,#play-button').click(function () {
            if (me.status != 2) {
                me.play();
            } else {
                me.pause();
            }
        });
        $container.find('#progress-bar').click(function (e) {
            var ratio = e.offsetX / $(this).width();
            me.navToTime(me.totalTime * ratio);
        });
        $container.find('#speed-up-button').click(function () {
            if (me.speed == 10) return;
            me.speed += 0.5;
            $container.find('#speed-display').text(me.speed * 100 + '%');
        });
        $container.find('#speed-down-button').click(function () {
            if (me.speed == 0.5) return;
            me.speed -= 0.5;
            $container.find('#speed-display').text(me.speed * 100 + '%');
        });
        var resizeButton = function () {
            var $button = $container.find('#play-button');
            var $term = $container.find('#playback-term');
            $button.parent().width($term.width())
            $button.parent().height($term.height())
        };


        this.term = new Terminal({ cols: parseInt(meta.term_width), rows: parseInt(meta.term_height), allowOuterScroll: true});

        this.frames = data;
        this.cursor = 0;
        this.next = {
            time: this.frames[0],
            data: this.frames[1]
        };
        this.interval = 30;
        this.status = 0;//0-Init;1-Pause;2-Playing
        this.totalTime = 0;
        this.elapsedTime = 0;
        for (var i = 0; i < this.frames.length; i += 2) {
            this.totalTime += this.frames[i];
        }
        this.timer = null;
        this.speed = 1;
        this.navToTime = function (t) {
            if (this.status == 0) {
                this.status = 1;
            }
            clearTimeout(this.timer);
            Terminal.call(me.term, { cols: parseInt(meta.term_width), rows: parseInt(meta.term_height), allowOuterScroll: true});
            me.term.refresh(0, me.term.rows - 1);
            this.elapsedTime = 0;
            for (this.cursor = 0; this.cursor < this.frames.length; this.cursor += 2) {
                if (this.elapsedTime + this.frames[this.cursor] < t) {
                    this.elapsedTime += this.frames[this.cursor];
                    this.term.write(this.frames[this.cursor + 1]);
                } else {
                    this.next = {
                        time: (this.elapsedTime + this.frames[this.cursor] - t),
                        data: this.frames[this.cursor + 1]
                    };
                    this.elapsedTime = this.elapsedTime + this.frames[this.cursor] - this.next.time;
                    break;
                }
            }
            this.onProgress(me.elapsedTime / me.totalTime * 100);
            this._play();
        };
        this.timeDisplay = function () {
            var times = [ parseInt(this.elapsedTime / 1000 / 60),
                parseInt(this.elapsedTime / 1000 % 60),
                parseInt(this.totalTime / 1000 / 60),
                parseInt(this.totalTime / 1000 % 60)
            ];
            for (var i in times) {
                times[i] = ('' + times[i]).length < 2 ? '0' + times[i] : times[i];
            }
            $container.find('#time-display').text(times[0] + ':' + times[1]
                + '/' +
                times[2] + ':' + times[3]);
        };
        this._play = function () {
            if (this.status != 2) {
                return;
            }
            if (this.next.time == 0) {
                this.term.write(this.next.data);
                if (this.cursor < this.frames.length - 2) {
                    this.cursor += 2;
                    this.next = {
                        time: this.frames[this.cursor],
                        data: this.frames[this.cursor + 1]
                    };
                } else {
                    this.status = 0;
                    this.elapsedTime = 0;
                    this.cursor = 0;
                    this.next = {
                        time: this.frames[0],
                        data: this.frames[1]
                    };
                    this.onStop();
                    return;
                }
            }
            var timeout = this.next.time > this.interval ? this.interval : this.next.time;
            this.timer = setTimeout(function () {
                me.next.time -= timeout;
                me.elapsedTime += timeout;
                me._play();
            }, timeout / this.speed);
            this.onProgress(me.elapsedTime / me.totalTime * 100);
            this.timeDisplay();

        };
        this.pause = function () {
            this.status = 1;
            this.onStop();
            clearTimeout(this.timer);
        };
        this.play = function () {
            if (this.status == 0) {
                Terminal.call(me.term, { cols: parseInt(meta.term_width), rows: parseInt(meta.term_height), allowOuterScroll: true});
            }
            me.term.scrollDisp(me.term.ybase);
            me.term.refresh(0, me.term.rows - 1);
            this.status = 2;
            this.onPlay();
            this._play();
            resizeButton();
        };


        this.term.open($container.find('#playback-term')[0]);
        this.onStop();//Disable cursor blink when start
        resizeButton();
        $(window).bind('resize pageshow', resizeButton);
        $container.find('.terminal').bind('mousewheel', function (e) {
            if (me.term.ydisp < me.term.lines.length - me.term.rows) {
                if (me.status == 2) {
                    me.pause();
                    $container.find('#pause-alert').fadeIn();
                }

            }
        });
        this.timeDisplay();
        $container.find('#pause-alert').hide().click(function () {
            $(this).fadeOut();
        });
        $container.find('#pause-alert #resume-link').click(function () {
            me.play();
            return false;
        });
    };

    Player.create = function (meta, data, $container, callback) {
        $container.html($('#loading-template').html());
        $container.html('');
        $container.html($('#player-template').html());
        (typeof callback === 'function' ? callback : $.noop)(new Player($container.find('div'), meta, data));
    };

    window.Player = Player;
})(window);

