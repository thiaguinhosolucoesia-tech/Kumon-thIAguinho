const App = {
    state: {
        userId: null,
        userRole: null,
        db: null,
        displayedDate: new Date(),
        isEditing: true,
        inventory: {},
        students: {},
        currentStudentId: null
    },
    elements: {},

    init(user, firestoreInstance) {
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('app-container').classList.remove('hidden');

        this.state.userId = user.uid;
        this.state.userRole = user.role;
        this.state.db = firestoreInstance;
        
        this.mapDOMElements();
        this.elements.userEmail.textContent = user.email;
        this.addEventListeners();

        this.populateActionBank();
        this.populateMaterialSelect();
        this.loadInventory();
        this.loadStudents();
        this.renderDay(this.getDateString(new Date()));
    },

    mapDOMElements() {
        this.elements = {
            userEmail: document.getElementById('userEmail'),
            logoutButton: document.getElementById('logout-button'),
            systemOptionsBtn: document.getElementById('system-options-btn'),
            currentDateDisplay: document.getElementById('currentDateDisplay'),
            prevDayBtn: document.getElementById('prevDayBtn'),
            nextDayBtn: document.getElementById('nextDayBtn'),
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
            dailyReportSection: document.getElementById('dailyReportSection'),
            dailyReportContent: document.getElementById('dailyReportContent'),
            downloadDailyReportBtn: document.getElementById('downloadDailyReportBtn'),
            weeklySummarySection: document.getElementById('weeklySummarySection'),
            weeklySummaryContent: document.getElementById('weeklySummaryContent'),
            downloadWeeklyReportBtn: document.getElementById('downloadWeeklyReportBtn'),
            showWeeklySummaryBtn: document.getElementById('showWeeklySummaryBtn'),
            materialSelect: document.getElementById('materialSelect'),
            materialQty: document.getElementById('materialQty'),
            addStockBtn: document.getElementById('addStockBtn'),
            removeStockBtn: document.getElementById('removeStockBtn'),
            inventoryTbody: document.getElementById('inventory-tbody'),
            uploadFileBtn: document.getElementById('uploadFileBtn'),
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
        this.elements.logoutButton.addEventListener('click', () => firebase.auth().signOut());
        this.elements.systemOptionsBtn.addEventListener('click', () => this.promptForReset());
        this.elements.prevDayBtn.addEventListener('click', () => this.navigateDays(-1));
        this.elements.nextDayBtn.addEventListener('click', () => this.navigateDays(1));
        this.elements.addTodoBtn.addEventListener('click', () => this.addTodoItem());
        this.elements.endDayBtn.addEventListener('click', () => this.handleFinalizeDay());
        this.elements.showWeeklySummaryBtn.addEventListener('click', () => this.generateWeeklyAnalysis());
        this.elements.downloadDailyReportBtn.addEventListener('click', () => this.downloadReport('daily'));
        this.elements.downloadWeeklyReportBtn.addEventListener('click', () => this.downloadReport('weekly'));
        this.elements.addStockBtn.addEventListener('click', () => this.updateStock('add', null, null, false));
        this.elements.removeStockBtn.addEventListener('click', () => this.updateStock('remove', null, null, false));
        this.elements.uploadFileBtn.addEventListener('click', () => this.openUploadWidget());
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

    getDocRef(collection, docId, uid = null) {
        const targetUid = uid || this.state.userId;
        if (!targetUid) return null;
        return this.state.db.collection('gestores').doc(targetUid).collection(collection).doc(docId);
    },

    getDateString: date => date.toISOString().split('T')[0],
    parseDateString: str => new Date(str + 'T12:00:00Z'),

    async fetchData(collection, docId, uid = null) {
        const docRef = this.getDocRef(collection, docId, uid);
        if (!docRef) return null;
        const doc = await docRef.get();
        return doc.exists ? doc.data() : null;
    },

    async saveData(collection, docId, data, uid = null) {
        const docRef = this.getDocRef(collection, docId, uid);
        if (docRef) await docRef.set(data, { merge: true });
    },

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
        } else {
            this.state.isEditing = true;
            const data = await this.fetchData('diario', this.getDateString(this.state.displayedDate));
            if (data?.diarioDeBordo) {
                data.diarioDeBordo.isFinalized = false;
                await this.saveData('diario', this.getDateString(this.state.displayedDate), data);
            }
        }
        this.renderDay(this.getDateString(this.state.displayedDate));
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
                analysisText += `• PONTO DE ATENÇÃO (RETENÇÃO): O saldo negativo de alunos é um sinal crítico.\n`;
            } else if ((totalMatriculas - totalCancelamentos) > 2) {
                analysisText += `• PONTO FORTE (CAPTAÇÃO): Excelente resultado! As estratégias de captação estão a funcionar.\n`;
            } else {
                analysisText += `• PONTO DE EQUILÍBRIO: A unidade manteve a sua base de alunos.\n`;
            }
            if (avgEnergy < 2.8 && avgEnergy > 0) {
                analysisText += `• PONTO DE ATENÇÃO (EQUIPA): A energia média baixa pode indicar desgaste. Avalie a sobrecarga de tarefas.\n`;
            }
        }
        this.elements.weeklySummaryContent.textContent = analysisText;
        this.elements.weeklySummarySection.scrollIntoView({ behavior: 'smooth' });
    },

    downloadReport(type) {
        const content = (type === 'daily') ? this.elements.dailyReportContent.textContent : this.elements.weeklySummaryContent.textContent;
        if (!content || content.includes("A gerar análise...")) {
            alert('Não há conteúdo no relatório para ser descarregado.');
            return;
        }
        const dateString = this.getDateString(this.state.displayedDate);
        const filename = (type === 'daily') ? `Relatorio_Diario_${dateString}.txt` : `Relatorio_Semanal_${dateString}.txt`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    promptForReset() {
        const code = prompt("Para aceder às opções de sistema, digite o código de segurança:");
        if (code === '*177' && confirm("ATENÇÃO: AÇÃO IRREVERSÍVEL!\nIsto irá apagar TODOS os dados (diários, inventário e alunos).\n\nPara confirmar, clique em OK.")) {
            this.hardResetUserData();
        } else if (code && code !== '*177') {
            alert("Código incorreto.");
        }
    },

    async hardResetUserData() {
        alert("A iniciar o reset completo do sistema. A página será recarregada ao concluir.");
        try {
            const collections = ['diario', 'inventario', 'alunos'];
            for (const name of collections) {
                const querySnapshot = await this.getDocRef(name, '').get();
                const batch = this.state.db.batch();
                querySnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            await this.saveData('alunos', 'lista_alunos', { students: {} });
            alert("Sistema resetado com sucesso.");
            location.reload();
        } catch (error) {
            alert("Ocorreu um erro ao tentar resetar o sistema.");
        }
    },
    
    populateActionBank() {
        const actions = {
            "🧠 Análise Pedagógica": ["Analisar pastas de 3 alunos com repetição.", "Verificar programação de 5 alunos próximos a mudar de estágio."],
            "👨‍👩‍👧 Comunicação com Pais": ["Ligar para 2 pais de alunos novos para feedback positivo.", "Agendar reunião com pais de aluno com dificuldade."],
            "🤝 Gestão da Equipe": ["Mini-treinamento de 10 min sobre 'Elogio Eficaz'.", "Delegar organização do estoque de blocos."],
            "🏢 Processos da Unidade": ["Auditar estoque dos 5 estágios mais comuns.", "Verificar limpeza da área de espera."],
            "🚀 Captação e Marketing": ["Publicar um 'caso de sucesso' nas redes sociais.", "Contactar uma escola parceira para evento."]
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
            this.elements.actionBankContent.querySelectorAll('.action-checkbox:checked').forEach(cb => {
                this.addTodoItem(cb.nextElementSibling.textContent);
                cb.checked = false;
            });
        });
    },

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
        if (sortedMaterials.length === 0) return;

        const html = sortedMaterials.map(materialId => {
            const item = this.state.inventory[materialId];
            if (!item.qty || item.qty <= 0) return '';
            const fileLink = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" rel="noopener noreferrer">Ver Ficheiro</a>` : 'Nenhum';
            return `<tr><td>${materialId.replace(/_/g, ' ')}</td><td>${item.qty}</td><td>${fileLink}</td></tr>`;
        }).join('');

        if (html) this.elements.inventoryTbody.innerHTML = html;
    },
    
    async updateStock(action, qty = null, materialId = null, isSilent = false) {
        const matId = materialId || this.elements.materialSelect.value;
        const quantity = qty || parseInt(this.elements.materialQty.value, 10);
        
        if (!matId || isNaN(quantity) || quantity <= 0) {
            if (!isSilent) alert("Selecione um material e insira uma quantidade válida.");
            return;
        }

        const currentQty = this.state.inventory[matId]?.qty || 0;

        if (action === 'remove' && currentQty < quantity) {
            if (!isSilent) {
                alert(`Estoque insuficiente de ${matId.replace(/_/g, ' ')}. Estoque atual: ${currentQty}. A programação será feita, mas o estoque ficará negativo.`);
            }
        }
        
        const newQty = (action === 'add') ? currentQty + quantity : currentQty - quantity;
        this.state.inventory[matId] = { ...this.state.inventory[matId], qty: newQty };
        
        await this.saveData('inventario', 'estoque', { materiais: this.state.inventory });
        this.renderInventory();
    },
    
    openUploadWidget() {
        const materialId = this.elements.materialSelect.value;
        if (!materialId) return alert("Selecione um material para anexar um ficheiro.");
        if (!window.cloudinary || !cloudinaryConfig) return alert("ERRO: Configuração do Cloudinary não encontrada.");
        
        cloudinary.createUploadWidget({
            cloudName: cloudinaryConfig.cloudName, uploadPreset: cloudinaryConfig.uploadPreset,
            folder: `${this.state.userId}/inventario`, tags: [this.state.userId, 'inventario', materialId]
        }, (error, result) => {
            if (!error && result?.event === "success") {
                this.saveFileUrlToInventory(materialId, result.info.secure_url);
            }
        }).open();
    },

    async saveFileUrlToInventory(materialId, fileUrl) {
        this.state.inventory[materialId] = { ...this.state.inventory[materialId], fileUrl: fileUrl };
        await this.saveData('inventario', 'estoque', { materiais: this.state.inventory });
        this.renderInventory();
        alert(`Ficheiro anexado ao material ${materialId.replace(/_/g, ' ')} com sucesso!`);
    },

    async loadStudents() {
        try {
            const doc = await this.getDocRef('alunos', 'lista_alunos').get();
            this.state.students = doc.exists ? doc.data().students || {} : {};
            this.renderStudentList();
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
        }
    },

    renderStudentList() {
        const searchTerm = this.elements.studentSearch.value.toLowerCase();
        const filtered = Object.entries(this.state.students).filter(([,s]) => s.name.toLowerCase().includes(searchTerm) || s.responsible.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            this.elements.studentList.innerHTML = `<div class="empty-state"><p>📚 Nenhum aluno encontrado.</p></div>`;
            return;
        }

        this.elements.studentList.innerHTML = filtered.sort(([,a],[,b]) => a.name.localeCompare(b.name)).map(([id, s]) => `
            <div class="student-card" onclick="App.openStudentModal('${id}')">
                <div class="student-card-header">
                    <div><h3 class="student-name">${s.name}</h3><p class="student-responsible">Resp: ${s.responsible}</p></div>
                </div>
                <div class="student-stages">
                    ${s.mathStage ? `<div class="stage-item"><span class="stage-label">Mat</span>${s.mathStage}</div>` : ''}
                    ${s.portStage ? `<div class="stage-item"><span class="stage-label">Port</span>${s.portStage}</div>` : ''}
                    ${s.engStage ? `<div class="stage-item"><span class="stage-label">Ing</span>${s.engStage}</div>` : ''}
                </div>
            </div>`).join('');
    },

    openStudentModal(studentId = null) {
        this.state.currentStudentId = studentId;
        this.elements.studentForm.reset();
        this.elements.studentModal.classList.remove('hidden');

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
            this.elements.studentAnalysisContent.textContent = 'Clique em "Gerar Nova Análise".';
        } else {
            this.elements.modalTitle.textContent = '👨‍🎓 Adicionar Novo Aluno';
            this.elements.studentIdInput.value = '';
            this.elements.deleteStudentBtn.style.display = 'none';
            this.clearStudentHistories();
            this.elements.studentAnalysisContent.textContent = 'Salve o aluno para gerar uma análise.';
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
        if (!this.elements.studentForm.checkValidity()) return this.elements.studentForm.reportValidity();
        
        const studentId = this.elements.studentIdInput.value || Date.now().toString();
        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            responsible: document.getElementById('studentResponsible').value.trim(),
            contact: document.getElementById('studentContact').value.trim(),
            mathStage: document.getElementById('mathStage').value.trim(),
            portStage: document.getElementById('portStage').value.trim(),
            engStage: document.getElementById('engStage').value.trim(),
        };

        this.state.students[studentId] = {
            ...(this.state.students[studentId] || {}),
            ...studentData,
            updatedAt: new Date().toISOString()
        };
        if (!this.state.students[studentId].createdAt) {
            this.state.students[studentId].createdAt = new Date().toISOString();
        }

        await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
        this.renderStudentList();
        this.openStudentModal(studentId);
        alert('Aluno salvo com sucesso!');
    },

    async deleteStudent() {
        if (!this.state.currentStudentId) return;
        if (!confirm(`Excluir "${this.state.students[this.state.currentStudentId].name}"? Ação irreversível.`)) return;
        
        delete this.state.students[this.state.currentStudentId];
        await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
        this.renderStudentList();
        this.closeStudentModal();
        alert('Aluno excluído!');
    },

    loadStudentHistories(studentId) {
        const s = this.state.students[studentId];
        if (!s) return this.clearStudentHistories();
        this.renderHistory('programmingHistory', s.programmingHistory || []);
        this.renderHistory('reportHistory', s.reportHistory || []);
        this.renderHistory('performanceLog', s.performanceLog || []);
    },

    clearStudentHistories() {
        this.elements.programmingHistory.innerHTML = '<p>Nenhum registro.</p>';
        this.elements.reportHistory.innerHTML = '<p>Nenhum registro.</p>';
        this.elements.performanceHistory.innerHTML = '<p>Nenhum registro.</p>';
    },

    async addHistoryEntry(event, historyType, formElement) {
        event.preventDefault();
        if (!this.state.currentStudentId) return alert('É necessário salvar o aluno antes de adicionar registros ao histórico.');

        const entry = { id: Date.now().toString(), createdAt: new Date().toISOString() };
        let isValid = true;
        new FormData(formElement).forEach((value, key) => {
            const element = formElement.querySelector(`[name="${key}"]`);
            if (element && element.required && !value) isValid = false;
            entry[key] = value;
        });

        if (!isValid) return alert('Por favor, preencha todos os campos obrigatórios.');

        if (historyType === 'programmingHistory') {
            entry.completed = false;
            entry.corrected = false;
            entry.grade = '';
        }
        
        const fileInput = formElement.querySelector('input[type="file"]');
        if (historyType === 'reportHistory' && fileInput && fileInput.files[0]) {
            try { entry.fileurl = await this.uploadFileToCloudinary(fileInput.files[0], 'boletins'); } 
            catch (error) { console.error('Erro no upload:', error); alert('Erro no upload do arquivo.'); }
        }

        const student = this.state.students[this.state.currentStudentId];
        student[historyType] = [...(student[historyType] || []), entry];

        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
            
            if (historyType === 'programmingHistory' && entry.material) {
                const materialId = entry.material.trim().replace(/\s/g, '_');
                await this.updateStock('remove', 1, materialId, true);
            }

            this.renderHistory(historyType, student[historyType]);
            formElement.reset();
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            alert('Falha ao salvar o registro.');
            student[historyType].pop();
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
        const date = entry.date ? new Date(entry.date + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Data Inválida';
        
        if (type === 'programmingHistory') {
            return `
                <div class="history-item programming-item">
                    <div class="history-item-header">
                        <span class="history-date">${date}</span>
                        <span class="history-type">PROGRAMAÇÃO</span>
                    </div>
                    <div class="history-details"><strong>Material:</strong> ${entry.material || ''}</div>
                    ${entry.notes ? `<div class="history-details"><strong>Obs:</strong> ${entry.notes}</div>` : ''}
                    <div class="programming-status">
                        <label><input type="checkbox" ${entry.completed ? 'checked' : ''} onchange="App.updateProgrammingStatus('${entry.id}', 'completed', this.checked)"> Realizado</label>
                        <label><input type="checkbox" ${entry.corrected ? 'checked' : ''} onchange="App.updateProgrammingStatus('${entry.id}', 'corrected', this.checked)"> Corrigido</label>
                        <label>Nota: <input type="text" class="programming-grade-input" value="${entry.grade || ''}" onchange="App.updateProgrammingStatus('${entry.id}', 'grade', this.value)"></label>
                    </div>
                    <button class="delete-history-btn" onclick="App.deleteHistoryEntry('${type}', '${entry.id}')" title="Excluir">&times;</button>
                </div>`;
        }
        
        let detailsHTML = '';
        switch (type) {
            case 'reportHistory':
                detailsHTML = `<div class="history-details"><strong>${entry.subject || ''}:</strong> Nota ${entry.grade || 'N/A'}</div>${entry.fileurl ? `<div class="history-file">📎 <a href="${entry.fileurl}" target="_blank">Ver anexo</a></div>` : ''}`;
                break;
            case 'performanceLog':
                detailsHTML = `<div class="history-details"><strong>${entry.type || 'REGISTRO'}:</strong> ${entry.details || ''}</div>`;
                break;
        }
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-date">${date}</span>
                </div>
                ${detailsHTML}
                <button class="delete-history-btn" onclick="App.deleteHistoryEntry('${type}', '${entry.id}')" title="Excluir">&times;</button>
            </div>`;
    },

    async deleteHistoryEntry(historyType, entryId) {
        if (!confirm('Excluir este registro?')) return;
        const student = this.state.students[this.state.currentStudentId];
        student[historyType] = student[historyType].filter(e => e.id !== entryId);
        await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
        this.renderHistory(historyType, student[historyType]);
    },

    async updateProgrammingStatus(entryId, field, value) {
        if (!this.state.currentStudentId) return;

        const student = this.state.students[this.state.currentStudentId];
        const programmingEntry = student.programmingHistory.find(p => p.id === entryId);
        if (!programmingEntry) return;

        programmingEntry[field] = value;
        
        try {
            await this.saveData('alunos', 'lista_alunos', { students: this.state.students });
        } catch (error) {
            console.error("Erro ao atualizar status da programação:", error);
            alert("Não foi possível salvar a alteração. A página será recarregada para garantir a consistência dos dados.");
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
            const lastAlert = alerts[alerts.length - 1];
            analysis += `⚡️ ALERTA(S) MANUAL(IS) REGISTRADO(S):\n   - "${lastAlert.details}" (${new Date(lastAlert.date + 'T12:00:00Z').toLocaleDateString('pt-BR')})\n   AÇÃO: Verificar se o problema foi resolvido.\n\n`;
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
