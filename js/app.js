const App = {
    state: {
        userId: null,
        db: null,
        displayedDate: new Date(),
        isEditing: true,
        inventory: {},
        students: {},
        currentStudentId: null
    },
    elements: {},

    // =====================================================================
    // ======================== INICIALIZAÇÃO E SETUP ======================
    // =====================================================================

    init(user, firestoreInstance) {
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('app-container').classList.remove('hidden');

        this.state.userId = user.uid;
        this.state.db = firestoreInstance;
        document.getElementById('userEmail').textContent = user.email;

        this.mapDOMElements();
        this.addEventListeners();

        this.populateActionBank();
        this.populateMaterialSelect();
        this.loadInventory();
        this.loadStudents();
        this.renderDay(this.getDateString(new Date()));
    },

    mapDOMElements() {
        this.elements = {
            // Geral
            logoutButton: document.getElementById('logout-button'),
            systemOptionsBtn: document.getElementById('system-options-btn'),
            currentDateDisplay: document.getElementById('currentDateDisplay'),
            prevDayBtn: document.getElementById('prevDayBtn'),
            nextDayBtn: document.getElementById('nextDayBtn'),

            // Diário de Bordo
            planningFieldset: document.getElementById('planningFieldset'),
            reviewFieldset: document.getElementById('reviewFieldset'),
            endDayBtn: document.getElementById('endDayBtn'),
            dailyFocus: document.getElementById('dailyFocus'),
            criticalTasks: document.getElementById('criticalTasks'),
            todoList: document.getElementById('todo-list'),
            newTodoInput: document.getElementById('new-todo-input'),
            addTodoBtn: document.getElementById('add-todo-btn'),
            mainAchievement: document.getElementById('mainAchievement'),
            mainChallenge: document.getElementById('mainChallenge'),
            kpiMatriculas: document.getElementById('kpiMatriculas'),
            kpiCancelamentos: document.getElementById('kpiCancelamentos'),
            energyLevel: document.getElementById('energyLevel'),
            actionBankContent: document.getElementById('actionBank-content'),

            // Relatórios
            dailyReportSection: document.getElementById('dailyReportSection'),
            dailyReportContent: document.getElementById('dailyReportContent'),
            downloadDailyReportBtn: document.getElementById('downloadDailyReportBtn'),
            weeklySummarySection: document.getElementById('weeklySummarySection'),
            weeklySummaryContent: document.getElementById('weeklySummaryContent'),
            downloadWeeklyReportBtn: document.getElementById('downloadWeeklyReportBtn'),
            showWeeklySummaryBtn: document.getElementById('showWeeklySummaryBtn'),

            // Inventário
            materialSelect: document.getElementById('materialSelect'),
            materialQty: document.getElementById('materialQty'),
            addStockBtn: document.getElementById('addStockBtn'),
            removeStockBtn: document.getElementById('removeStockBtn'),
            inventoryTbody: document.getElementById('inventory-tbody'),
            uploadFileBtn: document.getElementById('uploadFileBtn'),

            // Módulo de Alunos
            addStudentBtn: document.getElementById('addStudentBtn'),
            studentSearch: document.getElementById('studentSearch'),
            studentList: document.getElementById('student-list'),
            studentModal: document.getElementById('studentModal'),
            modalTitle: document.getElementById('modalTitle'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            studentForm: document.getElementById('studentForm'),
            studentIdInput: document.getElementById('studentId'),
            saveStudentBtn: document.getElementById('saveStudentBtn'),
            deleteStudentBtn: document.getElementById('deleteStudentBtn'),
            refreshAnalysisBtn: document.getElementById('refreshAnalysisBtn'),
            programmingForm: document.getElementById('programmingForm'),
            reportForm: document.getElementById('reportForm'),
            performanceForm: document.getElementById('performanceForm'),
            programmingHistory: document.getElementById('programmingHistory'),
            reportHistory: document.getElementById('reportHistory'),
            performanceHistory: document.getElementById('performanceHistory'),
            studentAnalysisContent: document.getElementById('student-analysis-content'),
        };
    },

    addEventListeners() {
        // Geral e Diário
        this.elements.logoutButton.addEventListener('click', () => firebase.auth().signOut());
        this.elements.systemOptionsBtn.addEventListener('click', () => this.promptForReset());
        this.elements.prevDayBtn.addEventListener('click', () => this.navigateDays(-1));
        this.elements.nextDayBtn.addEventListener('click', () => this.navigateDays(1));
        this.elements.addTodoBtn.addEventListener('click', () => this.addTodoItem());
        this.elements.endDayBtn.addEventListener('click', () => this.handleFinalizeDay());
        this.elements.showWeeklySummaryBtn.addEventListener('click', () => this.generateWeeklyAnalysis());
        this.elements.downloadDailyReportBtn.addEventListener('click', () => this.downloadReport('daily'));
        this.elements.downloadWeeklyReportBtn.addEventListener('click', () => this.downloadReport('weekly'));

        // Inventário
        this.elements.addStockBtn.addEventListener('click', () => this.updateStock('add'));
        this.elements.removeStockBtn.addEventListener('click', () => this.updateStock('remove'));
        this.elements.uploadFileBtn.addEventListener('click', () => this.openUploadWidget());

        // Alunos
        this.elements.addStudentBtn.addEventListener('click', () => this.openStudentModal());
        this.elements.studentSearch.addEventListener('input', () => this.renderStudentList());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeStudentModal());
        this.elements.saveStudentBtn.addEventListener('click', () => this.saveStudent());
        this.elements.deleteStudentBtn.addEventListener('click', () => this.deleteStudent());
        this.elements.refreshAnalysisBtn.addEventListener('click', () => this.analyzeStudent(this.state.currentStudentId));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab)));
        this.elements.programmingForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'programmingHistory', this.elements.programmingForm));
        this.elements.reportForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'reportHistory', this.elements.reportForm));
        this.elements.performanceForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'performanceLog', this.elements.performanceForm));
        this.elements.studentModal.addEventListener('click', (e) => { if (e.target === this.elements.studentModal) this.closeStudentModal(); });
    },

    // =====================================================================
    // ======================== LÓGICA DE DADOS (CORE) =====================
    // =====================================================================

    getDocRef(collection, docId) {
        if (!this.state.userId) return null;
        return this.state.db.collection('gestores').doc(this.state.userId).collection(collection).doc(docId);
    },

    getDateString: date => date.toISOString().split('T')[0],
    parseDateString: str => new Date(str + 'T12:00:00Z'),

    async fetchData(collection, docId) {
        const docRef = this.getDocRef(collection, docId);
        if (!docRef) return null;
        const doc = await docRef.get();
        return doc.exists ? doc.data() : null;
    },

    async saveData(collection, docId, data) {
        const docRef = this.getDocRef(collection, docId);
        if (docRef) await docRef.set(data, { merge: true });
    },

    // =====================================================================
    // ==================== MÓDULO DIÁRIO DE BORDO & GERAL =================
    // =====================================================================

    async renderDay(dateString) {
        this.state.displayedDate = this.parseDateString(dateString);
        this.elements.currentDateDisplay.textContent = this.state.displayedDate.toLocaleDateString('pt-BR', { dateStyle: 'full' });

        this.elements.dailyReportSection.classList.add('hidden');
        this.elements.weeklySummarySection.classList.add('hidden');

        const data = await this.fetchData('diario', dateString);
        const ddb = data?.diarioDeBordo || {};

        this.elements.dailyFocus.value = ddb.dailyFocus || '';
        this.elements.criticalTasks.value = ddb.criticalTasks || '';
        this.elements.mainAchievement.value = ddb.mainAchievement || '';
        this.elements.mainChallenge.value = ddb.mainChallenge || '';
        this.elements.kpiMatriculas.value = ddb.kpiMatriculas || 0;
        this.elements.kpiCancelamentos.value = ddb.kpiCancelamentos || 0;
        this.elements.energyLevel.value = ddb.energyLevel || 3;

        this.elements.todoList.innerHTML = '';
        (ddb.todo || []).forEach(task => this.createTodoElement(task));

        this.state.isEditing = !ddb.isFinalized;
        this.toggleFieldsDisabled();
    },

    toggleFieldsDisabled() {
        const isDisabled = !this.state.isEditing;
        this.elements.planningFieldset.disabled = isDisabled;
        this.elements.reviewFieldset.disabled = isDisabled;
        const lockMessage = document.getElementById('lockMessage');
        if (lockMessage) { lockMessage.remove(); }
        if (isDisabled) {
            this.elements.endDayBtn.textContent = 'Editar Dia';
            this.elements.endDayBtn.classList.add('edit-mode');
            const messageDiv = document.createElement('div');
            messageDiv.id = 'lockMessage';
            messageDiv.style.cssText = 'text-align:center; padding:10px; background-color:var(--light-blue); border-radius:8px; margin-top:20px; font-weight:bold;';
            messageDiv.innerHTML = `🔒 Este dia foi finalizado. Clique em "Editar Dia" para fazer alterações.`;
            this.elements.endDayBtn.parentElement.insertAdjacentElement('afterend', messageDiv);
        } else {
            this.elements.endDayBtn.textContent = 'Analisar e Finalizar Dia';
            this.elements.endDayBtn.classList.remove('edit-mode');
        }
    },

    navigateDays(direction) {
        this.state.displayedDate.setDate(this.state.displayedDate.getDate() + direction);
        this.renderDay(this.getDateString(this.state.displayedDate));
    },

    addTodoItem(text = null) {
        const taskText = text || this.elements.newTodoInput.value.trim();
        if (taskText) {
            this.createTodoElement({ text: taskText, completed: false });
        }
        if (!text) {
            this.elements.newTodoInput.value = '';
        }
    },

    createTodoElement(task) {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox" ${task.completed ? 'checked' : ''}><span>${task.text}</span><button class="delete-todo-btn">&times;</button>`;
        li.querySelector('.delete-todo-btn').onclick = () => li.remove();
        this.elements.todoList.appendChild(li);
    },

    collectUIData() {
        return {
            dailyFocus: this.elements.dailyFocus.value,
            criticalTasks: this.elements.criticalTasks.value,
            mainAchievement: this.elements.mainAchievement.value,
            mainChallenge: this.elements.mainChallenge.value,
            kpiMatriculas: this.elements.kpiMatriculas.value,
            kpiCancelamentos: this.elements.kpiCancelamentos.value,
            energyLevel: this.elements.energyLevel.value,
            todo: Array.from(this.elements.todoList.querySelectorAll('li')).map(li => ({
                text: li.querySelector('span').textContent,
                completed: li.querySelector('input[type="checkbox"]').checked
            })),
        };
    },

    async handleFinalizeDay() {
        if (this.state.isEditing) {
            if (!confirm("Tem certeza que deseja finalizar o dia?")) return;
            const dataToSave = this.collectUIData();
            dataToSave.isFinalized = true;
            const currentDateString = this.getDateString(this.state.displayedDate);
            await this.saveData('diario', currentDateString, { diarioDeBordo: dataToSave });
            this.generateDailyReport(currentDateString);
            const pendingTasks = dataToSave.todo.filter(task => !task.completed);
            if (pendingTasks.length > 0) {
                const nextDay = new Date(this.state.displayedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayString = this.getDateString(nextDay);
                const nextDayData = (await this.fetchData('diario', nextDayString)) || { diarioDeBordo: { todo: [] } };
                const tasksToCarryOver = pendingTasks.map(t => ({ text: `[ADIADO] ${t.text}`, completed: false }));
                nextDayData.diarioDeBordo.todo = [...tasksToCarryOver, ...(nextDayData.diarioDeBordo.todo || [])];
                await this.saveData('diario', nextDayString, nextDayData);
            }
            this.state.isEditing = false;
            this.toggleFieldsDisabled();
            alert("Dia finalizado com sucesso! O relatório do dia foi gerado abaixo.");
        } else {
            this.state.isEditing = true;
            const data = await this.fetchData('diario', this.getDateString(this.state.displayedDate));
            if (data?.diarioDeBordo) {
                data.diarioDeBordo.isFinalized = false;
                await this.saveData('diario', this.getDateString(this.state.displayedDate), data);
            }
            this.toggleFieldsDisabled();
        }
    },

    async generateDailyReport(dateString) {
        const data = await this.fetchData('diario', dateString);
        if (!data || !data.diarioDeBordo) {
            this.elements.dailyReportContent.textContent = "Não foi possível gerar o relatório: dados não encontrados.";
            this.elements.dailyReportSection.classList.remove('hidden');
            return;
        }
        const ddb = data.diarioDeBordo;
        const date = this.parseDateString(dateString);
        let reportText = `RELATÓRIO DE DIA - ${date.toLocaleDateString('pt-BR', {dateStyle: 'full'})}\n` +
                         `===========================================================\n\n` +
                         `🎯 FOCO PRINCIPAL: ${ddb.dailyFocus || 'Não definido'}\n\n` +
                         `🏆 CONQUISTA PRINCIPAL: ${ddb.mainAchievement || 'Não definida'}\n` +
                         `🧗 DESAFIO/APRENDIZADO: ${ddb.mainChallenge || 'Não definido'}\n\n` +
                         `--- KPIs ---\n` +
                         `📈 Matrículas: ${ddb.kpiMatriculas || 0}\n` +
                         `📉 Cancelamentos: ${ddb.kpiCancelamentos || 0}\n` +
                         `⚡ Energia da Equipa: ${ddb.energyLevel || 'N/A'} de 5\n\n` +
                         `--- TAREFAS ---\n`;
        (ddb.todo || []).forEach(task => { reportText += `[${task.completed ? 'X' : ' '}] ${task.text}\n`; });
        this.elements.dailyReportContent.textContent = reportText;
        this.elements.dailyReportSection.classList.remove('hidden');
        this.elements.dailyReportSection.scrollIntoView({ behavior: 'smooth' });
    },

    async generateWeeklyAnalysis() {
        this.elements.weeklySummarySection.classList.remove('hidden');
        this.elements.weeklySummaryContent.textContent = "A gerar análise...";
        let analysisText = `Análise de Performance Semanal (Consultor Estratégico)\n===========================================================\n\n`;
        let weeklyData = [];
        try {
            for (let i = 6; i >= 0; i--) {
                const date = new Date(this.state.displayedDate);
                date.setDate(date.getDate() - i);
                const data = await this.fetchData('diario', this.getDateString(date));
                if (data?.diarioDeBordo && data.diarioDeBordo.isFinalized) {
                    weeklyData.push(data.diarioDeBordo);
                }
            }
        } catch (error) {
            this.elements.weeklySummaryContent.textContent = "Erro ao gerar relatório.";
            return;
        }
        if (weeklyData.length === 0) {
            analysisText += "Não há dados finalizados suficientes na semana para uma análise completa.";
        } else {
            const totalMatriculas = weeklyData.reduce((acc, d) => acc + Number(d.kpiMatriculas || 0), 0);
            const totalCancelamentos = weeklyData.reduce((acc, d) => acc + Number(d.kpiCancelamentos || 0), 0);
            const daysWithEnergy = weeklyData.filter(d => d.energyLevel);
            const avgEnergy = daysWithEnergy.length > 0 ? (daysWithEnergy.reduce((acc, d) => acc + Number(d.energyLevel), 0) / daysWithEnergy.length) : 0;
            analysisText += `DIAGNÓSTICO GERAL:\n- Saldo de Alunos na Semana: ${totalMatriculas - totalCancelamentos} (Matrículas: ${totalMatriculas}, Cancelamentos: ${totalCancelamentos})\n- Nível de Energia Médio da Equipa: ${avgEnergy.toFixed(1)}/5\n\n`;
            analysisText += `ANÁLISE ESTRATÉGICA:\n`;
            if ((totalMatriculas - totalCancelamentos) < 0) {
                analysisText += `• PONTO DE ATENÇÃO (RETENÇÃO): O saldo negativo de alunos é um sinal crítico. É crucial analisar as causas dos cancelamentos desta semana.\n`;
            } else if ((totalMatriculas - totalCancelamentos) > 2) {
                analysisText += `• PONTO FORTE (CAPTAÇÃO): Excelente resultado! As estratégias de marketing estão a funcionar.\n`;
            } else {
                analysisText += `• PONTO DE EQUILÍBRIO: A unidade manteve a sua base de alunos. Foco na fidelização.\n`;
            }
            if (avgEnergy < 2.8 && avgEnergy > 0) {
                analysisText += `• PONTO DE ATENÇÃO (EQUIPA): A energia média consistentemente baixa é um forte indicador de desgaste. Avalie a sobrecarga de tarefas e promova o reconhecimento.\n`;
            }
        }
        this.elements.weeklySummaryContent.textContent = analysisText;
        this.elements.weeklySummarySection.scrollIntoView({ behavior: 'smooth' });
    },

    downloadReport(type) {
        let content = '';
        let dateString = this.getDateString(this.state.displayedDate);
        let filename = '';
        if (type === 'daily') {
            content = this.elements.dailyReportContent.textContent;
            filename = `Relatorio_Diario_${dateString}.txt`;
        } else {
            content = this.elements.weeklySummaryContent.textContent;
            filename = `Relatorio_Semanal_${dateString}.txt`;
        }
        if (!content || !content.trim() || content.includes("A gerar análise...")) {
            alert('Não há conteúdo no relatório para ser descarregado.');
            return;
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    promptForReset() {
        const code = prompt("Para aceder às opções de sistema, digite o código de segurança:");
        if (code === '*177') {
            const confirmation = prompt("ATENÇÃO: AÇÃO IRREVERSÍVEL!\nIsto irá apagar TODOS os seus diários, inventário e DADOS DE ALUNOS para SEMPRE.\n\nPara confirmar, digite 'APAGAR TUDO' e clique em OK.");
            if (confirmation === 'APAGAR TUDO') {
                this.hardResetUserData();
            } else {
                alert("Operação de reset cancelada.");
            }
        } else if (code !== null) {
            alert("Código incorreto.");
        }
    },

    async hardResetUserData() {
        alert("A iniciar o reset completo do sistema. A página será recarregada ao concluir.");
        try {
            const collections = ['diario', 'inventario', 'alunos'];
            for (const collectionName of collections) {
                const querySnapshot = await this.state.db.collection('gestores').doc(this.state.userId).collection(collectionName).get();
                if (querySnapshot.empty) continue;
                const batch = this.state.db.batch();
                querySnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            alert("Sistema resetado com sucesso.");
            location.reload();
        } catch (error) {
            console.error("Erro no reset:", error);
            alert("Ocorreu um erro ao tentar resetar o sistema.");
        }
    },

    populateActionBank() {
        const actions = {
            "🧠 Análise Pedagógica Individual": ["Identificar 3 alunos 'Longo Prazo' (acima de 2 anos) e agendar 'Reunião de Metas' com os pais.", "Revisar o tempo de conclusão dos blocos de 5 alunos em estágio inicial. Estão demasiado rápidos ou lentos?", "Analisar as pastas de 3 alunos que apresentaram erros de repetição e planear uma orientação individual.", "Verificar a programação de material de 5 alunos próximos a mudarem de estágio."],
            "👨‍👩‍👧 Comunicação com os Pais": ["Ligar para 2 pais de alunos novos (menos de 3 meses) apenas para dar um feedback positivo e perguntar como está a rotina em casa.", "Enviar um e-mail para a base de pais com um artigo sobre a importância da 'tarefa de casa bem feita'.", "Identificar um aluno com dificuldade e agendar uma reunião de alinhamento com os pais, já com um plano de ação em mãos.", "Preparar e enviar o 'Boletim de Desempenho Mensal' para os alunos do Estágio G em diante."],
            "🤝 Gestão da Equipe e Treinamento": ["Realizar um minitreinamento de 10 min sobre a 'Importância do Elogio' durante a correção.", "Observar por 15 minutos a interação de um auxiliar com os alunos e preparar um feedback construtivo.", "Delegar a tarefa de organização do estoque de blocos para um membro da equipa.", "Verificar se todos os treinamentos online obrigatórios da franquia estão em dia para toda a equipa."],
            "🏢 Processos e Ambiente da Unidade": ["Auditar o estoque dos 5 estágios mais comuns (ex: Mat. 4A, D, G; Port. AI, F) e verificar o ponto de pedido.", "Cronometrar o tempo médio de atendimento na receção em horário de pico para identificar gargalos.", "Verificar a limpeza e organização da 'Sala dos Pais' ou área de espera.", "Checar o funcionamento de todos os equipamentos (tablets, cronómetros, ar condicionado)."],
            "🚀 Captação e Marketing": ["Publicar um 'caso de sucesso' anónimo (ex: 'aluno avançou 2 anos escolares em 1') nas redes sociais.", "Entrar em contato com uma escola parceira para agendar uma visita ou evento conjunto.", "Analisar os dados dos últimos 10 novos alunos para identificar o principal canal de captação (indicação, fachada, etc.).", "Gravar um vídeo curto (1 min) para o Instagram com uma dica de estudo para os pais."]
        };
        let html = '';
        for (const category in actions) {
            html += `<h3>${category}</h3>`;
            actions[category].forEach(actionText => {
                html += `<label class="action-item"><input type="checkbox" class="action-checkbox"> <span>${actionText}</span></label>`;
            });
        }
        html += `<div class="button-container"><button id="add-selected-actions-btn" class="btn">Adicionar Selecionadas ao Dia</button></div>`;
        this.elements.actionBankContent.innerHTML = html;
        document.getElementById('add-selected-actions-btn').addEventListener('click', () => {
            const selectedActions = this.elements.actionBankContent.querySelectorAll('.action-checkbox:checked');
            selectedActions.forEach(checkbox => {
                this.addTodoItem(checkbox.nextElementSibling.textContent);
                checkbox.checked = false;
            });
        });
    },

    // =====================================================================
    // ======================== MÓDULO DE INVENTÁRIO =======================
    // =====================================================================

    populateMaterialSelect() {
        const materiais = ["Matemática 7A", "Matemática 6A", "Matemática 5A", "Matemática 4A", "Matemática 3A", "Matemática 2A", "Matemática A", "Matemática B", "Matemática C", "Matemática D", "Matemática E", "Matemática F", "Matemática G", "Matemática H", "Matemática I", "Matemática J", "Matemática K", "Matemática L", "Matemática M", "Matemática N", "Matemática O", "Português 7A", "Português 6A", "Português 5A", "Português 4A", "Português 3A", "Português 2A", "Português AI", "Português AII", "Português BI", "Português BII", "Português CI", "Português CII", "Português D", "Português E", "Português F", "Português G", "Português H", "Português I", "Inglês 5A", "Inglês 4A", "Inglês 3A", "Inglês 2A", "Inglês A", "Inglês B", "Inglês C", "Inglês D", "Inglês E", "Inglês F", "Inglês G", "Inglês H", "Inglês I", "Inglês J", "Inglês K", "Inglês L", "Inglês M", "Inglês N", "Inglês O"];
        this.elements.materialSelect.innerHTML = materiais.map(m => `<option value="${m.replace(/\s/g, '_')}">${m}</option>`).join('');
    },

    async loadInventory() {
        const inventoryData = await this.fetchData('inventario', 'estoque');
        this.state.inventory = inventoryData?.materiais || {};
        this.renderInventory();
    },

    renderInventory() {
        const defaultMessage = '<tr><td colspan="3">Nenhum material no estoque.</td></tr>';
        this.elements.inventoryTbody.innerHTML = defaultMessage;
        const sortedMaterials = Object.keys(this.state.inventory).sort();
        if (sortedMaterials.length > 0) {
            let hasStock = false;
            let html = '';
            for (const materialId of sortedMaterials) {
                const item = this.state.inventory[materialId];
                const qty = item.qty || 0;
                if (qty > 0) {
                    hasStock = true;
                    const fileLink = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" rel="noopener noreferrer">Ver Ficheiro</a>` : 'Nenhum';
                    html += `<tr><td>${materialId.replace(/_/g, ' ')}</td><td>${qty}</td><td>${fileLink}</td></tr>`;
                }
            }
            if (hasStock) { this.elements.inventoryTbody.innerHTML = html; }
        }
    },

    async updateStock(action) {
        const materialId = this.elements.materialSelect.value;
        const qty = parseInt(this.elements.materialQty.value, 10);
        if (!materialId || isNaN(qty) || qty <= 0) {
            alert("Selecione um material e insira uma quantidade válida.");
            return;
        }
        this.state.inventory[materialId] = this.state.inventory[materialId] || { qty: 0 };
        const currentQty = this.state.inventory[materialId].qty;
        if (action === 'remove' && currentQty < qty) {
            alert(`Não é possível dar baixa em ${qty} unidades. Estoque atual: ${currentQty}.`);
            return;
        }
        this.state.inventory[materialId].qty = (action === 'add') ? currentQty + qty : currentQty - qty;
        await this.saveData('inventario', 'estoque', { materiais: this.state.inventory });
        this.renderInventory();
    },

    openUploadWidget() {
        const materialId = this.elements.materialSelect.value;
        if (!materialId) {
            alert("Selecione um material para anexar um ficheiro.");
            return;
        }
        if (!cloudinaryConfig || !cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
            alert("ERRO: As chaves do Cloudinary não estão configuradas no ficheiro js/config.js.");
            return;
        }
        const uploadWidget = cloudinary.createUploadWidget({
            cloudName: cloudinaryConfig.cloudName,
            uploadPreset: cloudinaryConfig.uploadPreset,
            folder: `${this.state.userId}/inventario`,
            tags: [this.state.userId, 'inventario', materialId]
        }, (error, result) => {
            if (!error && result && result.event === "success") {
                this.saveFileUrlToInventory(materialId, result.info.secure_url);
            }
        });
        uploadWidget.open();
    },

    async saveFileUrlToInventory(materialId, fileUrl) {
        this.state.inventory[materialId] = this.state.inventory[materialId] || { qty: 0 };
        this.state.inventory[materialId].fileUrl = fileUrl;
        await this.saveData('inventario', 'estoque', { materiais: this.state.inventory });
        this.renderInventory();
        alert(`Ficheiro anexado ao material ${materialId.replace(/_/g, ' ')} com sucesso!`);
    },

    // =====================================================================
    // ======================= MÓDULO DE ALUNOS (REVISADO) =================
    // =====================================================================

    async loadStudents() {
        try {
            const doc = await this.getDocRef('alunos', 'lista_alunos').get();
            this.state.students = doc.exists ? doc.data().students || {} : {};
            this.renderStudentList();
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
            alert('Não foi possível carregar os dados dos alunos.');
        }
    },

    renderStudentList() {
        const searchTerm = this.elements.studentSearch.value.toLowerCase();
        const filteredStudents = Object.entries(this.state.students).filter(([id, student]) =>
            student.name.toLowerCase().includes(searchTerm) ||
            student.responsible.toLowerCase().includes(searchTerm)
        );

        if (filteredStudents.length === 0) {
            this.elements.studentList.innerHTML = `<div class="empty-state"><p>📚 ${searchTerm ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</p><p>Clique em "Adicionar Novo Aluno" para começar!</p></div>`;
            return;
        }

        this.elements.studentList.innerHTML = filteredStudents
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .map(([id, student]) => `
                <div class="student-card" onclick="App.openStudentModal('${id}')">
                    <div class="student-card-header">
                        <div>
                            <h3 class="student-name">${student.name}</h3>
                            <p class="student-responsible">Responsável: ${student.responsible}</p>
                        </div>
                    </div>
                    <div class="student-stages">
                        ${student.mathStage ? `<div class="stage-item"><span class="stage-label">Mat</span>${student.mathStage}</div>` : ''}
                        ${student.portStage ? `<div class="stage-item"><span class="stage-label">Port</span>${student.portStage}</div>` : ''}
                        ${student.engStage ? `<div class="stage-item"><span class="stage-label">Ing</span>${student.engStage}</div>` : ''}
                    </div>
                </div>
            `).join('');
    },

    openStudentModal(studentId = null) {
        this.state.currentStudentId = studentId;
        this.elements.studentModal.classList.remove('hidden');
        this.elements.studentForm.reset(); // Limpa o formulário sempre ao abrir

        if (studentId) {
            const student = this.state.students[studentId];
            this.elements.modalTitle.textContent = `📋 Ficha de ${student.name}`;
            this.elements.studentIdInput.value = studentId;
            document.getElementById('studentName').value = student.name || '';
            document.getElementById('studentResponsible').value = student.responsible || '';
            document.getElementById('studentContact').value = student.contact || '';
            document.getElementById('mathStage').value = student.mathStage || '';
            document.getElementById('portStage').value = student.portStage || '';
            document.getElementById('engStage').value = student.engStage || '';
            this.elements.deleteStudentBtn.style.display = 'block';
            this.loadStudentHistories(studentId);
            this.elements.studentAnalysisContent.textContent = 'Clique em "Gerar Nova Análise" para começar.';
        } else {
            this.elements.modalTitle.textContent = '👨‍🎓 Adicionar Novo Aluno';
            this.elements.studentIdInput.value = '';
            this.elements.deleteStudentBtn.style.display = 'none';
            this.clearStudentHistories();
            this.elements.studentAnalysisContent.textContent = 'Salve o aluno para poder gerar uma análise.';
        }
        this.switchTab('programming');
    },

    closeStudentModal() {
        this.elements.studentModal.classList.add('hidden');
        this.state.currentStudentId = null;
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    async saveStudent() {
        if (!this.elements.studentForm.checkValidity()) {
            this.elements.studentForm.reportValidity();
            return;
        }
        const studentId = this.elements.studentIdInput.value || Date.now().toString();
        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            responsible: document.getElementById('studentResponsible').value.trim(),
            contact: document.getElementById('studentContact').value.trim(),
            mathStage: document.getElementById('mathStage').value.trim(),
            portStage: document.getElementById('portStage').value.trim(),
            engStage: document.getElementById('engStage').value.trim(),
            programmingHistory: this.state.students[studentId]?.programmingHistory || [],
            reportHistory: this.state.students[studentId]?.reportHistory || [],
            performanceLog: this.state.students[studentId]?.performanceLog || [],
            createdAt: this.state.students[studentId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.state.students[studentId] = studentData;
        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
            this.renderStudentList();
            if (!this.state.currentStudentId) {
                this.state.currentStudentId = studentId;
                this.elements.studentIdInput.value = studentId;
                this.elements.modalTitle.textContent = `📋 Ficha de ${studentData.name}`;
                this.elements.deleteStudentBtn.style.display = 'block';
            }
            alert('Aluno salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            alert('Erro ao salvar aluno. Tente novamente.');
        }
    },

    async deleteStudent() {
        if (!this.state.currentStudentId) return;
        const studentName = this.state.students[this.state.currentStudentId].name;
        if (!confirm(`Tem certeza que deseja excluir o aluno "${studentName}"? Esta ação é irreversível.`)) return;
        delete this.state.students[this.state.currentStudentId];
        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
            this.renderStudentList();
            this.closeStudentModal();
            alert('Aluno excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir aluno:', error);
            alert('Erro ao excluir aluno. Tente novamente.');
        }
    },

    loadStudentHistories(studentId) {
        const student = this.state.students[studentId];
        if (!student) return this.clearStudentHistories();
        this.renderHistory('programmingHistory', student.programmingHistory || []);
        this.renderHistory('reportHistory', student.reportHistory || []);
        this.renderHistory('performanceLog', student.performanceLog || []);
    },

    clearStudentHistories() {
        this.elements.programmingHistory.innerHTML = '<p>Nenhuma programação registrada.</p>';
        this.elements.reportHistory.innerHTML = '<p>Nenhum boletim registrado.</p>';
        this.elements.performanceHistory.innerHTML = '<p>Nenhum registro de desempenho.</p>';
    },

    async addHistoryEntry(event, historyType, formElement) {
        event.preventDefault();
        if (!this.state.currentStudentId) {
            alert('É necessário salvar o aluno antes de adicionar registros ao histórico.');
            return;
        }

        const inputs = formElement.querySelectorAll('input, select, textarea');
        const entry = { id: Date.now().toString(), createdAt: new Date().toISOString() };
        let isValid = true;
        inputs.forEach(input => {
            if (input.required && !input.value) isValid = false;
            // Simplifica a chave, ex: 'programmingDate' vira 'date'
            const key = input.id.replace(/^(programming|report|performance)/, '').charAt(0).toLowerCase() + input.id.slice(1).replace(/^(rogramming|eport|erformance)/, '');
            if(input.type !== 'file') entry[key] = input.value;
        });

        if (!isValid) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (historyType === 'reportHistory') {
            const fileInput = formElement.querySelector('input[type="file"]');
            if (fileInput.files.length > 0) {
                try { entry.fileurl = await this.uploadFileToCloudinary(fileInput.files[0], 'boletins'); } 
                catch (error) { console.error('Erro no upload:', error); alert('Erro no upload do arquivo.'); }
            }
        }

        this.state.students[this.state.currentStudentId][historyType].push(entry);

        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
            this.renderHistory(historyType, this.state.students[this.state.currentStudentId][historyType]);
            formElement.reset();
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            alert('Falha ao salvar o registro.');
            this.state.students[this.state.currentStudentId][historyType].pop();
        }
    },

    renderHistory(historyType, historyData) {
        const container = this.elements[historyType];
        if (!historyData || historyData.length === 0) {
            container.innerHTML = `<p>Nenhum registro encontrado.</p>`;
            return;
        }
        container.innerHTML = historyData
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(entry => this.createHistoryItemHTML(historyType, entry))
            .join('');
    },

    createHistoryItemHTML(type, entry) {
        let detailsHTML = '';
        const date = entry.date ? new Date(entry.date + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Data Inválida';
        switch (type) {
            case 'programmingHistory':
                detailsHTML = `<div class="history-details"><strong>Material:</strong> ${entry.material || ''}</div>${entry.notes ? `<div class="history-details"><strong>Obs:</strong> ${entry.notes}</div>` : ''}`;
                break;
            case 'reportHistory':
                detailsHTML = `<div class="history-details"><strong>${entry.subject || ''}:</strong> Nota ${entry.grade || 'N/A'}</div>${entry.fileurl ? `<div class="history-file">📎 <a href="${entry.fileurl}" target="_blank">Ver anexo</a></div>` : ''}`;
                break;
            case 'performanceLog':
                detailsHTML = `<div class="history-details">${entry.details || ''}</div>`;
                break;
        }
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-date">${date}</span>
                    <span class="history-type">${entry.type || 'REGISTRO'}</span>
                </div>
                ${detailsHTML}
                <button class="delete-history-btn" onclick="App.deleteHistoryEntry('${type}', '${entry.id}')" title="Excluir">&times;</button>
            </div>`;
    },

    async deleteHistoryEntry(historyType, entryId) {
        if (!confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
        const student = this.state.students[this.state.currentStudentId];
        student[historyType] = student[historyType].filter(entry => entry.id !== entryId);
        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
            this.renderHistory(historyType, student[historyType]);
        } catch (error) {
            alert('Falha ao excluir o registro.');
            console.error(error);
            this.loadStudents();
        }
    },

    async analyzeStudent(studentId) {
        if (!studentId) return;
        const analysisContent = this.elements.studentAnalysisContent;
        analysisContent.textContent = 'Analisando dados do aluno...';
        const student = this.state.students[studentId];
        if (!student) {
            analysisContent.textContent = 'Erro: Dados do aluno não encontrados.';
            return;
        }
        let analysis = `ANÁLISE INTELIGENTE - ${student.name}\n${'='.repeat(50)}\n\n`;
        const repetitions = (student.performanceLog || []).filter(e => e.type === 'REPETICAO');
        if (repetitions.length >= 3) {
            analysis += `🚨 ALERTA DE PLATÔ: ${repetitions.length} repetições registradas.\n   AÇÃO: Revisar material e agendar orientação individual.\n\n`;
        } else if (repetitions.length > 0) {
            analysis += `⚠️ ATENÇÃO: ${repetitions.length} repetição(ões) registrada(s).\n   AÇÃO: Monitorar o próximo bloco com atenção.\n\n`;
        }
        const lowGrades = (student.reportHistory || []).filter(e => parseFloat(e.grade) < 7);
        if (lowGrades.length > 0) {
            analysis += `📊 PONTO DE ATENÇÃO (BOLETIM):\n   Nota(s) abaixo de 7.0 em: ${lowGrades.map(e => e.subject).join(', ')}.\n   AÇÃO: Agendar reunião com os pais para alinhar estratégias.\n\n`;
        }
        const alerts = (student.performanceLog || []).filter(e => e.type === 'ALERTA');
        if (alerts.length > 0) {
            analysis += `⚡️ ALERTA(S) MANUAL(IS) REGISTRADO(S):\n   - "${alerts[alerts.length - 1].details}" (${new Date(alerts[alerts.length - 1].date + 'T12:00:00Z').toLocaleDateString('pt-BR')})\n   AÇÃO: Verificar se o problema foi resolvido.\n\n`;
        }
        analysis += `💡 SUGESTÃO ESTRATÉGICA:\n`;
        if (repetitions.length >= 3 && lowGrades.length > 0) {
            analysis += `   Prioridade máxima: agendar reunião com os pais. O platô no Kumon pode estar correlacionado com a dificuldade na escola.\n`;
        } else if (!student.programmingHistory || student.programmingHistory.length === 0) {
            analysis += `   O aluno não possui programação registrada. Iniciar a programação de materiais é fundamental para acompanhar o progresso.\n`;
        } else {
            analysis += `   O progresso parece estável. Manter o acompanhamento e registrar elogios para reforço positivo.\n`;
        }
        analysis += `\nÚltima atualização: ${new Date().toLocaleString('pt-BR')}`;
        analysisContent.textContent = analysis;
    },

    async uploadFileToCloudinary(file, folder) {
        if (!cloudinaryConfig || !cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
            throw new Error('Configuração do Cloudinary não encontrada em js/config.js');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `${this.state.userId}/${folder}`);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Erro no upload para Cloudinary');
        const result = await response.json();
        return result.secure_url;
    }
};
