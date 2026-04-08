$(document).ready(function() {
    // Inicjalizacja jQuery UI Datepicker
    $("#taskDate").datepicker({
        dateFormat: "yy-mm-dd",
        minDate: 0,
        changeMonth: true,
        changeYear: true
    });

    // Inicjalizacja walidacji formularza
    $("#taskForm").validate({
        rules: {
            taskTitle: {
                required: true,
                minlength: 3,
                maxlength: 100
            },
            taskDescription: {
                maxlength: 500
            }
        },
        messages: {
            taskTitle: {
                required: "Tytuł jest wymagany",
                minlength: "Tytuł musi mieć co najmniej 3 znaki",
                maxlength: "Tytuł nie może mieć więcej niż 100 znaków"
            },
            taskDescription: {
                maxlength: "Opis nie może mieć więcej niż 500 znaków"
            }
        },
        errorElement: "div",
        errorClass: "text-danger small",
        errorPlacement: function(error, element) {
            error.addClass("ms-2");
            error.insertAfter(element);
        },
        submitHandler: addTask
    });

    // Tablica zadań
    let tasks = [];
    let taskCounter = 0;
    let table = $("#tasksTable").DataTable({
        responsive: true,
        paging: true,
        pageLength: 10,
        lengthChange: true,
        searching: false,
        ordering: true,
        info: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.13.7/i18n/pl.json" },
        dom: 'frtip'
    });

    // Przełącznik trybu ciemnego/jasnego
    $("#themeToggle").on("click", function() {
        $("body").toggleClass("dark-mode");
        const icon = $(this).find("i");
        if ($("body").hasClass("dark-mode")) {
            icon.removeClass("fa-moon").addClass("fa-sun");
            $(this).html('<i class="fas fa-sun"></i> Tryb jasny');
        } else {
            icon.removeClass("fa-sun").addClass("fa-moon");
            $(this).html('<i class="fas fa-moon"></i> Tryb ciemny');
        }
        localStorage.setItem("darkMode", $("body").hasClass("dark-mode"));
    });

    // Ładowanie trybu ciemnego z localStorage
    if (localStorage.getItem("darkMode") === "true") {
        $("body").addClass("dark-mode");
        $("#themeToggle").html('<i class="fas fa-sun"></i> Tryb jasny');
    }

    // Zdarzenia hover na statystykach
    $(".stat-box").hover(
        function() {
            $(this).addClass("shadow-lg").css("transform", "translateY(-5px)");
        },
        function() {
            $(this).removeClass("shadow-lg").css("transform", "translateY(0)");
        }
    );

    // Dodawanie zadania
    function addTask(formData) {
        const task = {
            id: ++taskCounter,
            title: $("#taskTitle").val(),
            description: $("#taskDescription").val() || "",
            date: $("#taskDate").val() || "",
            priority: $("#taskPriority").val(),
            completed: false,
            createdAt: new Date().toLocaleDateString('pl-PL')
        };

        tasks.unshift(task);
        updateTable();
        updateStats();
        formResetWithAnimation();
    }

    // Reset formularza z animacją
    function formResetWithAnimation() {
        $("#taskForm")[0].reset();
        $("#taskForm").find("input, textarea, select")
            .animate({ opacity: 0.5 }, 200)
            .animate({ opacity: 1 }, 200);
    }

    // Aktualizacja tabeli
    function updateTable() {
        table.clear();
        
        tasks.forEach(task => {
            const priorityClass = `priority-${task.priority}`;
            const completedClass = task.completed ? 'task-completed' : '';
            const checkIcon = task.completed ? 
                '<i class="fas fa-check-circle text-success"></i>' : 
                '<i class="far fa-circle text-muted"></i>';
            
            const row = table.row.add([
                checkIcon,
                `<span class="task-title">${task.title}</span>`,
                task.description.substring(0, 50) + (task.description.length > 50 ? '...' : ''),
                task.date || 'Brak terminu',
                `<span class="badge bg-${getPriorityBadgeClass(task.priority)}">${getPriorityLabel(task.priority)}</span>`,
                `
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn toggle-complete ${task.completed ? 'btn-success' : 'btn-outline-success'}" data-id="${task.id}" title="Zakończ">
                            <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                        </button>
                        <button class="btn btn-warning edit-task" data-id="${task.id}" title="Edytuj">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger delete-task" data-id="${task.id}" title="Usuń">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `
            ]).draw(false).node();
            
            $(row).addClass(priorityClass + ' ' + completedClass).hide().fadeIn(500);
        });
    }

    // Obsługa zdarzeń przycisków w tabeli
    $("#tasksTable tbody").on("click", ".toggle-complete", function() {
        const id = parseInt($(this).data("id"));
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            updateTable();
            updateStats();
        }
    });

        $("#tasksTable tbody").on("click", ".delete-task", function() {
        const id = parseInt($(this).data("id"));
        const taskIndex = tasks.findIndex(t => t.id === id);
        
        if (taskIndex !== -1) {
            $("#tasksTable tbody tr").eq(taskIndex).slideUp(400, function() {
                $(this).remove();
            });
            
            setTimeout(() => {
                tasks.splice(taskIndex, 1);
                updateStats();
            }, 400);
        }
    });

    $("#tasksTable tbody").on("click", ".edit-task", function() {
        const id = parseInt($(this).data("id"));
        const task = tasks.find(t => t.id === id);
        
        if (task) {
            // Wypełnij formularz danymi
            $("#taskTitle").val(task.title);
            $("#taskDescription").val(task.description);
            $("#taskDate").val(task.date);
            $("#taskPriority").val(task.priority);
            
            // Przewiń do formularza z animacją
            $("html, body").animate({
                scrollTop: $("#taskForm").offset().top - 100
            }, 800);
            
            // Oznacz zadanie jako edytowane
            $("#taskForm").prepend(`
                <div id="editModeIndicator" class="alert alert-warning alert-dismissible fade show" role="alert">
                    <i class="fas fa-edit me-2"></i>Edytujesz zadanie: <strong>${task.title}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `);
            
            // Zapisuj ID edytowanego zadania
            $("#taskForm").data("editingId", id);
            
        }
    });

    // Wyczyść wszystkie zadania
    $("#clearAll").on("click", function() {
        if (tasks.length === 0) {
            showNotification("Brak zadań do usunięcia", "info");
            return;
        }
        
        if (confirm("Czy na pewno chcesz usunąć WSZYSTKIE zadania?")) {
            $("#tasksTable tbody tr").slideUp(400, function() {
                $(this).remove();
            });
            
            setTimeout(() => {
                tasks = [];
                taskCounter = 0;
                updateStats();
                showNotification("Wszystkie zadania zostały usunięte!", "danger");
            }, 400);
        }
    });

    // Aktualizacja statystyk
    function updateStats() {
        const total = tasks.length;
        const pending = tasks.filter(t => !t.completed).length;
        const completed = tasks.filter(t => t.completed).length;
        const highPriority = tasks.filter(t => t.priority === "high").length;

        $("#totalTasks").text(total);
        $("#pendingTasks").text(pending);
        $("#completedTasks").text(completed);
        $("#highPriority").text(highPriority);

        // Animacja statystyk
        $(".stat-box h2").each(function() {
            $(this).addClass("btn-pulse");
            setTimeout(() => $(this).removeClass("btn-pulse"), 2000);
        });
    }

    // Powiadomienia
    function showNotification(message, type = "info") {
        const icons = {
            success: "fa-check-circle",
            danger: "fa-exclamation-circle",
            warning: "fa-exclamation-triangle",
            info: "fa-info-circle"
        };
        
        const notification = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
                 role="alert">
                <i class="fas ${icons[type]} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        $("body").append(notification);
        
        // Automatyczne ukrycie po 4 sekundach z animacją
        setTimeout(() => {
            $(".alert").first().fadeOut(500, function() {
                $(this).remove();
            });
        }, 4000);
    }

    // Funkcje pomocnicze
    function getPriorityBadgeClass(priority) {
        switch(priority) {
            case "high": return "danger";
            case "medium": return "warning";
            case "low": return "success";
            default: return "secondary";
        }
    }

    function getPriorityLabel(priority) {
        switch(priority) {
            case "high": return "WYSOKI";
            case "medium": return "ŚREDNI";
            case "low": return "NISKI";
            default: return priority;
        }
    }

    // Klawisz Enter w inpucie wyszukiwania DataTables
    $("#tasksTable_filter input").on("keyup", function(e) {
        if (e.key === "Enter") {
            $(this).trigger("search.dt");
        }
    });

    // Efekt hover na wierszach tabeli
    $("#tasksTable tbody").on("mouseenter", "tr", function() {
        $(this).addClass("table-active shadow-sm");
        $(this).find(".btn-group").stop().fadeIn(200);
    }).on("mouseleave", "tr", function() {
        $(this).removeClass("table-active shadow-sm");
        if (!$(this).hasClass("table-hover-active")) {
            $(this).find(".btn-group").stop().fadeOut(200);
        }
    });

    $(".card").hide().each(function(index) {
        $(this).delay(100 * index).fadeIn(800);
    });
});