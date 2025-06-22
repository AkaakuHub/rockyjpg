// ==UserScript==
// @name         課題提出ページ モダン化スクリプト
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  課題提出ページを2025年現代的デザインに改善し、提出ボタンをテーブルに統合
// @match        */~rocky/lecture/VisComp/hw25.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // DOMが完全に読み込まれてから実行
    window.addEventListener("load", function () {
        // === 1. ページ構造の分析と変数定義 ===

        // 課題一覧テーブル（最初のborder="3"のテーブル）
        const assignmentTable = document.querySelector('table[border="3"]');

        // 提出状況テーブル（2番目のborder="3"のテーブル）
        const submissionTable =
            document.querySelectorAll('table[border="3"]')[1];

        // フォーム要素
        const form = document.querySelector('form[action*="hw25.php"]');

        if (!assignmentTable || !submissionTable || !form) {
            console.error("必要な要素が見つかりません");
            return;
        }

        // === 2. 提出済み課題のデータを収集 ===

        const submittedAssignments = new Map();

        const submissionRows = submissionTable.querySelectorAll("tbody tr");
        submissionRows.forEach((row, index) => {
            if (index === 0) return; // ヘッダー行をスキップ

            const cells = row.querySelectorAll("td");
            if (cells.length >= 2) {
                const assignmentId = cells[0].textContent.trim();
                const hasFile = cells[1].querySelector("a") !== null;

                if (hasFile && assignmentId) {
                    submittedAssignments.set(assignmentId, {
                        file: cells[1].innerHTML,
                        submitTime:
                            cells.length > 2 ? cells[2].textContent.trim() : "",
                        grading: cells.length > 3 ? cells[3].innerHTML : "",
                        comment: cells.length > 4 ? cells[4].innerHTML : "",
                    });
                }
            }
        });

        // === 3. 提出回数情報の処理と表示 ===

        // 提出回数テーブルを検索（最後のテーブル）
        const allTables = document.querySelectorAll(
            "table"
        );
        // console.log("全テーブル:", allTables);
        // 一番最後のテーブルを提出回数テーブルとする
        const submissionCountTable = allTables[allTables.length - 1];
        // console.log("提出回数テーブル:", submissionCountTable);
        let totalAssignments = 0;
        let submittedCount = 0;

        if (submissionCountTable) {
            const countCell =
                submissionCountTable.querySelector("td:last-child");
            if (countCell && countCell.textContent.includes("/")) {
                const countText = countCell.textContent.trim();
                const parts = countText.split("/");
                if (parts.length === 2) {
                    submittedCount = parseInt(parts[0]);
                    totalAssignments = parseInt(parts[1]);
                }
            }
        }

        // 提出状況サマリーを作成
        const summaryCard = document.createElement("div");
        summaryCard.className = "submission-summary";

        const remaining = totalAssignments - submittedCount;
        const completionRate = Math.round(
            (submittedCount / totalAssignments) * 100
        );

        let summaryHTML = `
            <div class="summary-content">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-number">${submittedCount}</span>
                        <span class="stat-label">提出済み</span>
                    </div>
                    <div class="stat-divider">/</div>
                    <div class="stat-item">
                        <span class="stat-number">${totalAssignments}</span>
                        <span class="stat-label">総課題数</span>
                    </div>
                </div>
                <div class="completion-rate">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionRate}%"></div>
                    </div>
                    <span class="rate-text">${completionRate}% 完了</span>
                </div>
        `;

        if (remaining > 0) {
            summaryHTML += `
                <div class="remaining-alert">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-text">残り <strong>${remaining}個</strong> の課題があります</span>
                </div>
            `;
        } else {
            summaryHTML += `
                <div class="completion-badge">
                    <span class="badge-icon">🎉</span>
                    <span class="badge-text">全ての課題が完了しました！</span>
                </div>
            `;
        }

        summaryHTML += "</div>";
        summaryCard.innerHTML = summaryHTML;

        // 提出回数テーブルを非表示にし、サマリーカードを挿入
        if (submissionCountTable) {
            // submissionCountTable.style.display = "none";
            // 課題一覧テーブルの前に挿入
            assignmentTable.parentNode.insertBefore(
                summaryCard,
                assignmentTable
            );
        }

        // === 4. メインテーブルの改造 ===

        // テーブルヘッダーの拡張（3列に変更：コメントを提出詳細に統合）
        const headerRow = assignmentTable.querySelector("tbody tr");
        if (headerRow) {
            // 新しいヘッダーを追加
            const newHeaders = ["提出状況", "提出詳細", "操作"];
            newHeaders.forEach((headerText) => {
                const th = document.createElement("td");
                th.textContent = headerText;
                th.style.fontWeight = "bold";
                th.style.backgroundColor = "#f8f9fa";
                headerRow.appendChild(th);
            });
        }

        // データ行の処理
        const dataRows = Array.from(
            assignmentTable.querySelectorAll("tbody tr")
        ).slice(1);
        dataRows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 3) return;

            const assignmentId = cells[0].textContent.trim();
            const submissionData = submittedAssignments.get(assignmentId);
            const isSubmitted = !!submissionData;

            // 日付フォーマットの改善
            const deadlineText = cells[2].textContent.trim();
            if (deadlineText.length === 8) {
                const month = deadlineText.substring(0, 2);
                const day = deadlineText.substring(2, 4);
                const hour = deadlineText.substring(4, 6);
                const minute = deadlineText.substring(6, 8);
                cells[2].textContent = `${month}/${day} ${hour}:${minute}`;
            }

            // 提出日のフォーマット改善
            const submitDateText = cells[1].textContent.trim();
            if (submitDateText.length === 4) {
                const month = submitDateText.substring(0, 2);
                const day = submitDateText.substring(2, 4);
                cells[1].textContent = `${month}/${day}`;
            }

            // 提出状況セル
            const statusCell = document.createElement("td");
            if (isSubmitted) {
                statusCell.innerHTML =
                    '<span class="status-badge submitted">✅ 済</span>';
                row.classList.add("submitted-row");
            } else {
                statusCell.innerHTML =
                    '<span class="status-badge not-submitted">❌ 未</span>';
                row.classList.add("not-submitted-row");
            }
            row.appendChild(statusCell);

            // 提出詳細セル（ファイル・提出時間・採点を縦に配置）
            const detailsCell = document.createElement("td");
            detailsCell.classList.add("details-cell");

            let detailsHtml = '<div class="detail-container">';

            // ファイル情報
            const fileInfo = submissionData ? submissionData.file : "---";
            detailsHtml += `<div class="detail-row"><span class="detail-label">ファイル:</span><span class="detail-value">${fileInfo}</span></div>`;

            // 提出時間
            const submitTime = submissionData
                ? submissionData.submitTime
                : "---";
            if (submitTime && submitTime !== "---") {
                // 提出時間のフォーマット変換（例：05081646 → 05/08 16:46）
                if (submitTime.length === 8) {
                    const month = submitTime.substring(0, 2);
                    const day = submitTime.substring(2, 4);
                    const hour = submitTime.substring(4, 6);
                    const minute = submitTime.substring(6, 8);
                    const formattedTime = `${month}/${day} ${hour}:${minute}`;
                    detailsHtml += `<div class="detail-row"><span class="detail-label">提出時間:</span><span class="detail-value">${formattedTime}</span></div>`;
                } else {
                    detailsHtml += `<div class="detail-row"><span class="detail-label">提出時間:</span><span class="detail-value">${submitTime}</span></div>`;
                }
            } else {
                detailsHtml += `<div class="detail-row"><span class="detail-label">提出時間:</span><span class="detail-value">---</span></div>`;
            }

            // 採点
            const grading =
                submissionData && submissionData.grading
                    ? submissionData.grading
                    : "---";
            detailsHtml += `<div class="detail-row"><span class="detail-label">採点:</span><span class="detail-value">${grading}</span></div>`;

            // コメント（提出詳細に統合）
            const comment = submissionData ? submissionData.comment : "---";
            if (comment && comment !== "---" && comment.trim() !== "") {
                detailsHtml += `<div class="detail-row comment-row"><span class="detail-label">コメント:</span><span class="detail-value comment-text">${comment}</span></div>`;
            }

            detailsHtml += "</div>";
            detailsCell.innerHTML = detailsHtml;
            row.appendChild(detailsCell);

            // 操作セル（提出ボタン）
            const actionCell = document.createElement("td");
            // if (!isSubmitted) {
            const submitBtn = document.createElement("button");
            submitBtn.textContent = "提出";
            submitBtn.className = "submit-btn";
            submitBtn.dataset.assignmentId = assignmentId;
            actionCell.appendChild(submitBtn);
            // } else {
            //     actionCell.innerHTML = '<span class="completed-mark">完了</span>';
            // }
            row.appendChild(actionCell);
        });

        // === 4. 提出ボタンのイベントハンドラー ===

        assignmentTable.addEventListener("click", function (event) {
            if (event.target.classList.contains("submit-btn")) {
                event.preventDefault();
                const assignmentId = event.target.dataset.assignmentId;

                // フォームデータを作成して直接送信
                const formData = new FormData();
                const selectElement = form.querySelector(
                    'select[name="exerciseID"]'
                );
                const studentIdInput = form.querySelector(
                    'input[name="studentID"]'
                );

                if (selectElement && studentIdInput !== null) {
                    // フォームデータを設定
                    formData.append("exerciseID", assignmentId);
                    formData.append("studentID", studentIdInput.value);
                    formData.append("select", "次へ");

                    // XMLHttpRequestで送信（フォーム送信をシミュレート）
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", form.action, true);
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                // 成功時は新しいページの内容で現在のページを更新
                                document.open();
                                document.write(xhr.responseText);
                                document.close();
                            } else {
                                // エラー時は元のフォーム送信にフォールバック
                                selectElement.value = assignmentId;
                                form.submit();
                            }
                        }
                    };
                    xhr.send(formData);
                }
            }
        });

        // === 5. 古い要素の整理 ===

        // 元の提出状況テーブルとその説明を非表示
        let currentNode = submissionTable.previousSibling;

        // 提出状況関連のテキストとhrを探して非表示
        while (currentNode) {
            if (
                currentNode.nodeType === Node.TEXT_NODE &&
                currentNode.textContent.includes("これまでの提出状況")
            ) {
                currentNode.textContent = "";
            }
            if (currentNode.nodeName === "HR") {
                currentNode.style.display = "none";
            }
            currentNode = currentNode.previousSibling;
        }

        submissionTable.style.display = "none";

        // 元のフォーム部分を非表示（但し、動作は保持）
        const formSections = form.querySelectorAll("p");
        formSections.forEach((p) => {
            p.style.display = "none";
            p.style.visibility = "hidden";
            p.style.position = "absolute";
            p.style.left = "-9999px";
        });

        // フォーム直前のテキストを非表示
        let formPrevNode = form.previousSibling;
        while (formPrevNode) {
            if (
                formPrevNode.nodeType === Node.TEXT_NODE ||
                (formPrevNode.nodeName === "FONT" &&
                    formPrevNode.textContent.includes("課題提出処理"))
            ) {
                if (formPrevNode.style) {
                    formPrevNode.style.display = "none";
                } else {
                    formPrevNode.textContent = "";
                }
            }
            if (formPrevNode.nodeName === "HR") {
                formPrevNode.style.display = "none";
                break;
            }
            formPrevNode = formPrevNode.previousSibling;
        }

        // // === 6. CSS注入 ===

        // const link = document.createElement("link");
        // link.rel = "stylesheet";
        // link.type = "text/css";
        // link.href = chrome.runtime.getURL("style.css");
        // document.head.appendChild(link);

        // === 7. ページ全体のラッパー作成 ===

        const wrapper = document.createElement("div");
        wrapper.className = "modern-wrapper";

        // body直下の要素をラッパーに移動
        while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);

        console.log("課題提出ページの現代化が完了しました");
    });
})();
