const Manual = class {
    constructor(id) {
        this.id = id;
    }

    init(helper) {
        this.helper = helper;
        this.repo = this.helper.repository.find(m => m.ModuleID == this.id);
        if (!this.repo) this.error = true;
        if (this.error) this.close.on("mouseenter", () => this.close.html("\u00d7")).on("mouseleave", () => this.close.html("\u01c3"));
        this.tab = $("<div/>").addClass("manual-tab").append($("<div/>").addClass("manual-tab-name").text(this.error ? this.id : this.repo.Name)).on("click", () => this.helper.selectManual(this.id));
        if (!this.error) this.tab.attr({ title: this.repo.Name + " (" + this.id + ")" });
        if (this.error) this.tab.addClass("manual-tab-error");
        this.selected = false;
    }

    select(selected) {
        if (selected == this.selected) return;
        this.selected = selected;
        if (this.selected && !this.error) {
            this.tab.addClass("manual-tab-selected");
            if (!this.frame && !this.error) {
                var createframe = () => {
                    if (this.frame) this.frame.remove();
                    this.frame = $("<div/>").addClass("manual-frame").appendTo(this.helper.manualArea);
                    var loaderback = $("<div/>").addClass("manual-frame-loader-back").appendTo(this.frame).fadeIn(200);
                    var loader = $("<div/>").addClass("manual-frame-loader").appendTo(this.frame);
                    $("<div/>").addClass("manual-frame-loader-spinner").appendTo(loader);
                    var didFirstLoad = false;
                    var iframe = $("<iframe/>").addClass("manual-frame-frame").attr({ src: "https://ktane.timwi.de/HTML/" + encodeURIComponent(this.repo.FileName || this.repo.Name) + ".html" }).appendTo(this.frame).on("load", () => {
                        if (didFirstLoad) {
                            createframe();
                            return;
                        }
                        didFirstLoad = true;
                        console.log("Loaded %s page", this.id);
                        loader.remove();
                        loaderback.stop().fadeOut(200, () => loaderback.remove());
                    }).on("error", () => createframe());
                };
                createframe();
            }
            if (this.frame) this.frame.show();
        } else {
            this.tab.removeClass("manual-tab-selected");
            if (this.frame) this.frame.hide();
        }
    }

    remove() {
        this.tab.remove();
        if (this.frame) this.frame.remove();
    }
};
const ExpertHelper = class {
    constructor() {
        this.wrapper = $("<div/>").addClass("wrapper").appendTo(document.body);
        this.headerBar = $("<div/>").addClass("header-bar").appendTo(this.wrapper);
        this.manualArea = $("<div/>").addClass("manual-area").appendTo(this.wrapper);
        this.footerBar = $("<div/>").addClass("footer-bar").appendTo(this.wrapper);

        this.manuals = [];
        this.selectedManual = null;

        this.repository = null;
        var repoloader = $("<div/>").addClass("repo-loader").appendTo(document.body);
        var loaderText = $("<div/>").addClass("repo-loader-text").html("Loading repository data\u2026").appendTo(repoloader);
        var hash = window.location.hash.slice(1);
        if (!hash) {
            loaderText.html("Missing window hash");
            return;
        }
        try {
            var hashData = JSON.parse(atob(hash));
            $.getJSON("https://ktane.timwi.de/json/raw", (data) => {
                this.repository = data.KtaneModules;
                console.log("Fetched %i entries from repository", this.repository.length);
                this.init(hashData);
                repoloader.remove();
            }).catch((e) => {
                console.error(e);
                loaderText.html("Failed to fetch repository data");
            });
        } catch (e) {
            // malformed JSON, a likely result of the hash not being a valid base64 string
            loaderText.html("Invalid URL hash");
        }
    }

    init(data) {
        console.log("Initializing with provided data:", data);
        //this.headerBar.append($("<div/>").addClass("header-bar-name").text(data.name.trim()));
        data.manuals.forEach((m) => {
            if (m.ManualType > 1) return;
            this.addManual(m.ID);
        });
        this.addWidget({ Type: "Timer", Time: data.totalTime });
        data.widgets.forEach((w) => this.addWidget(w));
    }

    addManual(id) {
        if (this.getManualIndex(id) > -1) {
            this.selectManual(id);
            return;
        }
        var manual = new Manual(id);
        manual.init(this);
        var l = this.manuals.push(manual);
        this.headerBar.append(manual.tab);
        if (1 === l) this.selectManual(manual.id);
    }

    getManualIndex(id) {
        return this.manuals.findIndex(m => m.id == id);
    }

    selectManual(id) {
        if (id === this.selectedManual) return;
        var index = typeof id == "number" ? id : this.getManualIndex(id);
        this.manuals.forEach((m) => m.select(false));
        this.manuals[index].select(true);
        console.log("Selected %s (%s)", this.manuals[index].id, this.manuals[index].error ? "[unknown name]" : this.manuals[index].repo.Name);
        this.selectedManual = this.manuals[index].id;
    }

    createWidget(widget) {
        switch (widget.Type) {
            case "Timer":
                var p = (n) => n.toString().padStart(2, "0");
                var t = widget.Time;
                var n1 = Math.floor(t / 60);
                var n2 = Math.floor(t % 60);
                var n3 = Math.floor((t - n1 * 60 - n2) * 100) % 100;
                var ts = p(n1) + ":" + p(n2);
                if (t < 60) ts = p(n2) + "." + p(n3);
                return $("<div/>").addClass("widget widget-timer").append($("<div/>").addClass("widget-timer-back").text("88:88"), $("<div/>").addClass("widget-timer-front").text(ts));
            case "Serial":
                return $("<div/>").addClass("widget widget-serial").text(widget.Number);
            case "Battery":
                return $("<div/>").addClass("widget widget-battery widget-battery-" + widget.BatteryType);
            case "Port":
                var w = $("<div/>").addClass("widget widget-port");
                widget.Ports.forEach((p) => $("<div/>").addClass("widget-port-port").css({ backgroundImage: "url(img/port/" + p + ".png)" }).appendTo(w));
                return w;
            case "Indicator":
                var w = $("<div/>").addClass("widget widget-indicator").text(widget.Label);
                if (widget.On) w.addClass("widget-indicator-lit");
                return w;
        }
    }

    addWidget(widget) {
        this.footerBar.append(this.createWidget(widget));
    }
};