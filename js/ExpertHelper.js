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
                var createframe = () => {
                    if (this.frame) this.frame.remove();
                    this.frame = $("<div/>").addClass("manual-frame").appendTo(this.helper.manualArea);
                    var loaderback = $("<div/>").addClass("manual-frame-loader-back").appendTo(this.frame).fadeIn(200);
                    var loader = $("<div/>").addClass("manual-frame-loader").appendTo(this.frame);
                    $("<div/>").addClass("manual-frame-loader-spinner").appendTo(loader);
                    var didFirstLoad = false;
                    var iframe = $("<iframe/>").addClass("manual-frame-frame").attr({ src: "https://ktane.timwi.de/HTML/" + encodeURIComponent(this.repo.FileName || this.repo.Name) + ".html" }).appendTo(this.frame).on("load", () => {
                        if (didFirstLoad) {
                            console.log(iframe[0].contentWindow.location.href);
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
        this.panels = [];
        this.wrapper = $("<div/>").addClass("wrapper").appendTo(document.body);
        this.headerBar = $("<div/>").addClass("header-bar").appendTo(this.wrapper);
        this.manualArea = $("<div/>").addClass("manual-area").appendTo(this.wrapper);

        this.manuals = [];
        this.selectedManual = null;

        this.repository = null;
        var repoloader = $("<div/>").addClass("repo-loader").appendTo(document.body);
        $("<div/>").addClass("repo-loader-text").html("Loading repository data\u2026").appendTo(repoloader);
        $.getJSON("https://ktane.timwi.de/json/raw", (data) => {
            this.repository = data.KtaneModules;
            repoloader.remove();
            console.log("Fetched %i entries from repository", this.repository.length);
            var search = window.location.search.replace("?", "").split("&");
            var params = {};
            search.forEach((h) => {
                var s = h.split("=");
                params[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
            });
            if (params.name && params.name.trim()) {
                this.headerBar.append($("<div/>").addClass("header-bar-name").text(params.name.trim()));
            }
            if (params.manuals) {
                var manuals = params.manuals.split(",").map((m) => m.trim());
                if (!manuals.length) return;
                this.addManuals(manuals);
                if (this.modalwrap) this.modalwrap.remove();
                this.modalwrap = null;
            }
            this.addHeaderPlus();
        });
    }

    addHeaderPlus() {
        if (this.headerPlus) this.headerPlus.remove();
        if (this.headerPlusError) this.headerPlusError.remove();
        this.headerPlus = $("<div/>").addClass("header-plus").attr({ title: "Add manual" }).html("\u002b").appendTo(this.headerBar).on("click", () => this.addManualPrompt());
        if (this.manuals.some((m) => m.error)) this.addHeaderPlusError();
        if (this.manuals.length == 0 && !this.modalwrap) {
            this.addManualPrompt(true);
        }
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

    addManualPrompt(nocancel) {
        var wrap = $("<div/>").addClass("manual-prompt-wrapper").appendTo(this.wrapper);
        this.modalwrap = wrap;
        wrap.css({ opacity: 0 }).animate({ opacity: 1 }, 200);
        var modal = $("<div/>").addClass("manual-prompt-modal").appendTo(wrap);
        modal.css({ top: 10 }).animate({ top: 0 }, 200);
        $("<div/>").addClass("manual-prompt-modal-title").html("Add Manuals").appendTo(modal);
        $("<div/>").addClass("manual-prompt-modal-instructions").html("Enter module IDs below in a comma-separated list. Press Enter to add. Typing a module name will allow you to autofill the ID. (click a result or use arrow keys / Tab)").appendTo(modal);
        var autofill = null;
        var autofillIndex = 0;
        var fillAutoFill = null;
        var input = $("<textarea/>").addClass("manual-prompt-input").attr({ placeholder: "BigButton, WhosOnFirst, Morse, etc..." }).appendTo(modal)
            .on("change", () => resize())
            .on("keydown", (e) => {
                if (e.key == "Enter") {
                    e.preventDefault();
                    submit();
                    return;
                }
                if (e.key == "Tab") {
                    e.preventDefault();
                    if (fillAutoFill) fillAutoFill();
                }
                if (e.key == "ArrowUp") {
                    e.preventDefault();
                    autofillIndex--;
                    check();
                }
                if (e.key == "ArrowDown") {
                    e.preventDefault();
                    autofillIndex++;
                    check();
                }
                setTimeout(() => {
                    resize();
                    check();
                }, 0);
            })
            //.on("keyup", () => check())
            .on("focus", () => check())
            .on("click", () => check())
            .on("blur", () => {
                if (autofill) autofill.remove();
            });
        var resize = () => {
            input.css({ height: 0 }).css({ height: input.prop("scrollHeight") });
        };
        var submit = () => {
            var IDs = input.val().split(",").map((id) => id.trim()).filter((id) => id);
            var isvalid = IDs.length;
            console.log("Adding module IDs: %s", isvalid ? IDs.map((id) => '"' + id + '"').join(", ") : "[none]");
            if (!nocancel || isvalid) {
                wrap.remove();
                this.modalwrap = null;
            }
            if (isvalid) setTimeout(() => this.addManuals(IDs), 200);
        };
        var check = () => {
            if (autofill) autofill.remove();
            var caret = input.prop("selectionStart");
            var val = input.val();
            var split = val.split(",");
            var splitPoints = [-1];
            split.forEach((e, i) => {
                var n = splitPoints[i] + e.length + 1;
                splitPoints.push(n);
            });
            var pointGreater = splitPoints.findIndex((s) => caret <= s);
            var section = split[pointGreater - 1];
            if (!section || !section.trim()) return;
            var query = section.trim();
            var formatToBasic = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            var testForQuery = (v) => formatToBasic(v).includes(formatToBasic(query));
            var results = this.repository.filter((e) => testForQuery(e.ModuleID) || testForQuery(e.Name));
            var isq = (v) => v.ModuleID.toLowerCase() == query.toLowerCase() || v.Name.toLowerCase() == query.toLowerCase();
            results.sort((a, b) => isq(a) && !isq(b) ? -1 : !isq(a) && isq(b) ? 1 : 0).sort((a, b) => new Date(a.Published) - new Date(b.Published));
            autofill = $("<div/>").addClass("autofill-wrapper").appendTo(postInput);
            autofillIndex = Math.min(Math.max(autofillIndex, 0), Math.min(results.length - 1, 4));
            var ress = results.splice(0, 5)
            ress.forEach((r, i) => {
                var w = $("<div/>").addClass("autofill-result").appendTo(autofill).on("mouseenter", () => {
                    if (autofillIndex == i) return;
                    autofillIndex = i;
                    check();
                }).on("mousedown", (e) => {
                    e.preventDefault();
                    fillAutoFill();
                });
                if (i == autofillIndex) w.addClass("autofill-result-selected");
                $("<div/>").addClass("autofill-name").text(r.Name).appendTo(w);
                $("<div/>").addClass("autofill-id").text(r.ModuleID).appendTo(w);
            });
            fillAutoFill = () => {
                var mod = ress[autofillIndex];
                var start = splitPoints[pointGreater - 1] + 1;
                var newVal = val.substring(0, start) + mod.ModuleID + val.substring(start + section.length);
                input.val(newVal);
            };
        };

        var postInput = $("<div/>").appendTo(modal);

        $("<div/>").addClass("manual-prompt-submit").html("Add").appendTo(modal).on("click", () => submit());
        if (!nocancel) {
            $("<br/>").appendTo(modal);
            $("<div/>").addClass("manual-prompt-cancel").html("Cancel").appendTo(modal).on("click", () => {
                wrap.remove();
                this.modalwrap = null;
            });
        }
    }
};