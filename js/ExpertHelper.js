const Manual = class {
    constructor(id) {
        this.id = id;
    }

    init(helper) {
        this.helper = helper;
        this.repo = this.helper.repository.find(m => m.ModuleID == this.id);
        if (!this.repo) this.error = true;
        this.close = $("<div/>").addClass("manual-tab-close").html(this.error ? "\u01c3" : "\u00d7");
        if (this.error) this.close.on("mouseenter", () => this.close.html("\u00d7")).on("mouseleave", () => this.close.html("\u01c3"));
        this.tab = $("<div/>").addClass("manual-tab").append(
            $("<div/>").addClass("manual-tab-name").text(this.error ? this.id : this.repo.Name),
            this.close
        ).on("click", (e) => {
            if (e.target == this.close[0]) {
                this.helper.removeManual(this.id);
            } else {
                if (!this.error) this.helper.selectManual(this.id);
            }
        });
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
                this.frame = $("<div/>").addClass("manual-frame").appendTo(this.helper.manualArea);
                var loaderback = $("<div/>").addClass("manual-frame-loader-back").appendTo(this.frame).fadeIn(200);
                var loader = $("<div/>").addClass("manual-frame-loader").appendTo(this.frame);
                $("<div/>").addClass("manual-frame-loader-spinner").appendTo(loader);
                $("<iframe/>").addClass("manual-frame-frame").attr({ src: "https://ktane.timwi.de/HTML/" + encodeURIComponent(this.repo.FileName || this.repo.Name) + ".html" }).appendTo(this.frame).on("load", () => {
                    console.log("Loaded %s page", this.id);
                    loader.remove();
                    loaderback.stop().fadeOut(200, () => loaderback.remove());
                });
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
        this.panels = [];
        this.wrapper = $("<div/>").addClass("wrapper").appendTo(document.body);
        this.headerBar = $("<div/>").addClass("header-bar").appendTo(this.wrapper);
        this.manualArea = $("<div/>").addClass("manual-area").appendTo(this.wrapper);

        this.manuals = [];
        this.selectedManual = null;
        this.addHeaderPlus();

        this.repository = [];
        $.getJSON("https://ktane.timwi.de/json/raw", (data) => {
            this.repository = data.KtaneModules;
            console.log("Fetched %i entries from repository", this.repository.length);
            /* this.addManual("BigButton");
            this.addManual("WhosOnFirst");
            this.addManual("NonExistentModule");
            this.addManual("NonExistentModule2");
            this.addManual("Morse"); */
            var search = window.location.search.replace("?", "").split("&");
            var params = {};
            search.forEach((h) => {
                var s = h.split("=");
                params[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
            });
            if (params.manuals) {
                var manuals = params.manuals.split(",").map((m) => m.trim());
                if (!manuals.length) return;
                this.addManuals(manuals);
                if (manuals.length == 1) this.headerBar.hide();
            }
        });
    }

    addHeaderPlus() {
        if (this.headerPlus) this.headerPlus.remove();
        if (this.headerPlusError) this.headerPlusError.remove();
        this.headerPlus = $("<div/>").addClass("header-plus").attr({ title: "Add manual" }).html("\u002b").appendTo(this.headerBar);
        if (this.manuals.some((m) => m.error)) this.addHeaderPlusError();
    }

    addHeaderPlusError() {
        this.headerPlusError = $("<div/>").addClass("header-plus header-plus-error").attr({ title: "Remove errored manuals " }).html("\u01c3").appendTo(this.headerBar).on("click", () => {
            this.manuals.filter((m) => m.error).forEach((m) => this.removeManual(m.id));
        });
    }

    addManual(id) {
        if (this.getManualIndex(id) > -1) {
            this.selectManual(id);
            return;
        }
        var manual = new Manual(id);
        manual.init(this);
        this.manuals.push(manual);
        this.headerBar.append(manual.tab);
        this.addHeaderPlus();
        if (this.manuals.length == 1) this.selectManual(manual.id);
    }

    addManuals(ids) {
        ids.forEach((id) => this.addManual(id));
    }

    getManualIndex(id) {
        return this.manuals.findIndex(m => m.id == id);
    }

    selectManual(id) {
        var index = typeof id == "number" ? id : this.getManualIndex(id);
        this.manuals.forEach((m) => m.select(false));
        this.manuals[index].select(true);
        console.log("Selected %s (%s)", this.manuals[index].id, this.manuals[index].error ? "[unknown name]" : this.manuals[index].repo.Name);
        this.selectedManual = this.manuals[index].id;
    }

    removeManual(id) {
        var index = this.getManualIndex(id);
        this.manuals[index].remove();
        this.manuals.splice(index, 1);
        this.addHeaderPlus();
        console.log("Removed %s", id);
        if (id == this.selectedManual) {
            if (this.manuals[index] && !this.manuals[index].error) this.selectManual(index);
            else if (this.manuals[index - 1] && !this.manuals[index - 1].error) this.selectManual(index - 1);
        }
    }
};