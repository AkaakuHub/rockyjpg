// ==UserScript==
// @name         課題提出ページ改善スクリプト (統合版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  古いUIの課題提出ページをモダンで見やすく改善し、テーブルを統合、フォームを各行のボタンに変更します。
// @match        */~rocky/lecture/VisComp/hw25.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- 0. ページのDOMが読み込まれたら実行 ---
    // DOMContentLoadedだと画像の読み込みなどでスタイルが崩れることがあるため、window.onloadを使用
    window.addEventListener('load', () => {

        // --- 0. 全体をラッパーで囲む ---
        const wrapper = document.createElement('div');
        wrapper.className = 'homework-wrapper';
        // body直下の要素を全てラッパーに移動
        while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);


        // --- 1. 提出済み課題の情報を収集 ---
        const submittedData = new Map();
        const submissionStatusTable = document.querySelectorAll('table')[2];
        if (submissionStatusTable) {
            const rows = submissionStatusTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 1) return;

                const idCell = cells[0];
                const idLink = idCell.querySelector('a');
                // 課題IDの取得方法をaタグの有無で分岐
                const id = idLink ? idLink.textContent.trim() : idCell.textContent.trim();

                if (!id) return; // 空の行はスキップ

                const fileCell = cells.length > 1 ? cells[1].innerHTML : '---';
                const timeCell = cells.length > 2 ? cells[2].textContent.trim() : '---';
                const gradingCell = cells.length > 3 ? cells[3].innerHTML : '---';
                const commentCell = cells.length > 4 ? cells[4].innerHTML.trim() : '---';

                submittedData.set(id, {
                    file: fileCell,
                    time: timeCell,
                    grading: gradingCell,
                    comment: commentCell,
                });
            });
        }


        // --- 2. 課題一覧テーブルを処理し、統合テーブルを作成 ---
        const assignmentListTable = document.querySelectorAll('table')[1];
        if (assignmentListTable) {
            // ヘッダーを<thead>に移動
            const thead = assignmentListTable.createTHead();
            const headerRow = assignmentListTable.querySelector('tbody tr');
            thead.appendChild(headerRow);

            // 古いヘッダーを調整
            headerRow.cells[0].textContent = '課題';
            headerRow.cells[1].textContent = '提出日';
            headerRow.cells[2].textContent = '〆切';

            // 新しいヘッダーセルを追加
            const newHeaders = ['提出状況', '〆切までの残り', '提出ファイル', '採点', 'コメント', '操作'];
            newHeaders.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });


            // 課題行を処理
            const rows = assignmentListTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.cells;
                if (cells.length < 3) return;

                const id = cells[0].textContent.trim();
                const isSubmitted = submittedData.has(id);
                const submissionInfo = isSubmitted ? submittedData.get(id) : {};

                // a. 提出状況を判定してクラスとアイコンを追加
                const statusCell = row.insertCell(3);
                if (isSubmitted) {
                    row.classList.add('submitted');
                    statusCell.innerHTML = '<span class="status-icon submitted">✅ 提出済み</span>';
                } else {
                    row.classList.add('not-submitted');
                    statusCell.innerHTML = '<span class="status-icon not-submitted">❌ 未提出</span>';
                }

                // b. 日時を整形し、残り時間を計算
                const deadlineCell = cells[2];
                const deadlineStr = deadlineCell.textContent.trim();
                const countdownCell = row.insertCell(4);

                if (deadlineStr.length === 8) {
                    const year = new Date().getFullYear();
                    const month = parseInt(deadlineStr.substring(0, 2), 10);
                    const day = parseInt(deadlineStr.substring(2, 4), 10);
                    const hour = parseInt(deadlineStr.substring(4, 6), 10);
                    const minute = parseInt(deadlineStr.substring(6, 8), 10);
                    const deadlineDate = new Date(year, month - 1, day, hour, minute);

                    // 日付フォーマット変更
                    deadlineCell.textContent = `${month}/${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

                    // 残り時間計算とクラス付与
                    const now = new Date();
                    const diffMs = deadlineDate.getTime() - now.getTime();

                    if (diffMs < 0) {
                        countdownCell.textContent = '期限切れ';
                        if (!isSubmitted) {
                            row.classList.add('missed-submission');
                        }
                    } else {
                        const diffHours = diffMs / (1000 * 60 * 60);
                        const diffDays = Math.floor(diffHours / 24);
                        const remainingHours = Math.floor(diffHours % 24);
                        countdownCell.textContent = `あと ${diffDays}日 ${remainingHours}時間`;

                        if (diffHours <= 24) {
                            row.classList.add('deadline-today');
                        } else if (diffHours <= 24 * 3) {
                            row.classList.add('deadline-soon');
                        }
                    }
                } else {
                    countdownCell.textContent = '---';
                }

                // c. 提出済み情報を追加
                const fileCell = row.insertCell(5);
                fileCell.innerHTML = submissionInfo.file || '---';

                const gradingCell = row.insertCell(6);
                const gradingText = submissionInfo.grading ? new DOMParser().parseFromString(submissionInfo.grading, 'text/html').body.textContent.trim() : '';
                 if (gradingText === '採点済') {
                    gradingCell.innerHTML = '<span class="status-badge graded">採点済</span>';
                } else if (gradingText === '未採点') {
                    gradingCell.innerHTML = '<span class="status-badge not-graded">未採点</span>';
                } else {
                    gradingCell.innerHTML = '---';
                }

                const commentCell = row.insertCell(7);
                commentCell.innerHTML = submissionInfo.comment || '---';
                commentCell.classList.add('comment-cell');


                // d. 操作セル（提出ボタン）を追加
                const actionCell = row.insertCell(8);
                if (!isSubmitted) {
                    const button = document.createElement('button');
                    button.textContent = '提出';
                    button.className = 'submit-button';
                    button.dataset.exerciseId = id; // data属性に課題IDを格納
                    actionCell.appendChild(button);
                } else {
                    actionCell.textContent = '---';
                }
            });
        }

        // --- 3. 古い要素を非表示または削除 ---
        if (submissionStatusTable) {
            // 「これまでの提出状況」という見出しとhrを削除
            let elementToRemove = submissionStatusTable.previousSibling;
            while(elementToRemove) {
                if (elementToRemove.nodeName === 'HR' || (elementToRemove.nodeType === 3 && elementToRemove.textContent.includes('これまでの提出状況'))) {
                    const prev = elementToRemove.previousSibling;
                    elementToRemove.remove();
                    elementToRemove = prev;
                } else {
                    elementToRemove = elementToRemove.previousSibling;
                }
            }
            submissionStatusTable.remove();
        }

        const formElement = document.querySelector('form[action*="hw25.php"]');
        if (formElement) {
            // 元のフォームの選択肢部分などを非表示に
            const formParagraphs = formElement.querySelectorAll('p');
            formParagraphs.forEach(p => p.style.display = 'none');
            // 「課題提出処理はここから」などの見出しも非表示に
            let node = formElement.firstChild;
            while(node) {
                if(node.nodeName === 'FONT' || node.nodeName === 'BR' || (node.nodeType === 3 && node.textContent.trim() !== '')) {
                   if(node.style) node.style.display = 'none';
                   else {
                       const span = document.createElement('span');
                       span.style.display = 'none';
                       node.parentNode.insertBefore(span, node);
                       span.appendChild(node);
                   }
                }
                node = node.nextSibling;
            }
        }


        // --- 4. 提出ボタンにイベントリスナーを設定 ---
        assignmentListTable.addEventListener('click', (event) => {
            if (event.target.classList.contains('submit-button')) {
                const exerciseId = event.target.dataset.exerciseId;
                if (exerciseId && formElement) {
                    const selectElement = formElement.querySelector('select[name="exerciseID"]');
                    selectElement.value = exerciseId;
                    formElement.submit();
                }
            }
        });

        // --- 5. CSSを注入 ---
        const style = document.createElement('style');
        style.textContent = `
/* ==========================================================================
   課題提出ページ改善 CSS
   ========================================================================== */

/* --- 全体的なスタイル調整 --- */
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    background-color: #f8f9fa;
    color: #212529;
    line-height: 1.6;
    margin: 0;
    padding: 0;
}

/* --- コンテンツのラッパー --- */
.homework-wrapper {
    max-width: 1200px;
    margin: 20px auto;
    padding: 2em;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* --- 古い要素の非表示・調整 --- */
hr {
    display: none;
}
center h3 {
    font-size: 1.8em;
    color: #343a40;
    margin-bottom: 1em;
    font-weight: 600;
}
font[color="#ff0000"], font[color="#0000ff"] {
    color: inherit !important;
    font-weight: 600;
}

/* --- テーブルのスタイル --- */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
    font-size: 0.95em;
    border: 1px solid #dee2e6;
    border-radius: 8px; /* For Safari */
    overflow: hidden;
    table-layout: fixed; /* カラム幅の固定 */
}
th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
    vertical-align: middle;
    word-wrap: break-word; /* テキストの折り返し */
}

thead th {
    background-color: #f1f3f5;
    font-weight: 600;
    color: #495057;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.5px;
}
tbody tr:last-child td {
    border-bottom: none;
}
tbody tr:hover {
    background-color: #f1f3f5;
}

/* --- カラム幅の調整 --- */
table thead th:nth-child(1) { width: 10%; } /* 課題 */
table thead th:nth-child(2) { width: 7%; }  /* 提出日 */
table thead th:nth-child(3) { width: 9%; }  /* 〆切 */
table thead th:nth-child(4) { width: 11%; } /* 提出状況 */
table thead th:nth-child(5) { width: 12%; } /* 〆切までの残り */
table thead th:nth-child(6) { width: 12%; } /* 提出ファイル */
table thead th:nth-child(7) { width: 8%; }  /* 採点 */
table thead th:nth-child(8) { width: 23%; } /* コメント */
table thead th:nth-child(9) { width: 8%; }  /* 操作 */


/* --- 課題の状態別スタイル --- */
tr.submitted {
    background-color: #e6f9f0; /* 提出済み: 薄緑 */
    color: #555;
}
tr.submitted a { color: #0056b3; }
tr.not-submitted {
    /* background-color: #fff9e6; */ /* 未提出: 薄黄は不要かも */
}
tr.missed-submission {
    background-color: #fff2f2; /* 期限切れ未提出: 薄赤 */
    color: #888;
}
tr.missed-submission td:not(:first-child) {
     text-decoration: line-through;
     color: #adb5bd;
}
tr.missed-submission a { color: #adb5bd; }

/* --- 〆切のハイライト --- */
.deadline-soon, tr.deadline-soon td:nth-child(5) {
    font-weight: bold;
    color: #fd7e14 !important; /* 〆切間近: オレンジ */
}
.deadline-today, tr.deadline-today td:nth-child(5) {
    font-weight: bold;
    color: #dc3545 !important; /* 本日〆切: 赤 */
    animation: blink 1.5s linear infinite;
}

@keyframes blink {
    50% { opacity: 0.5; }
}

/* --- ステータスアイコン/バッジ --- */
.status-icon, .status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85em;
    font-weight: 600;
    white-space: nowrap;
}
.status-icon.submitted { background-color: #28a745; color: white; }
.status-icon.not-submitted { background-color: #ffc107; color: #212529; }
.status-badge.graded { background-color: #007bff; color: white; }
.status-badge.not-graded { background-color: #fd7e14; color: white; }
.comment-cell { font-size: 0.9em; color: #495057; }

/* --- 提出ボタン --- */
.submit-button {
    background-color: #007bff;
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    padding: 8px 14px;
    border-radius: 4px;
    font-size: 0.9em;
    font-weight: bold;
}
.submit-button:hover {
    background-color: #0056b3;
}

/* --- 説明文等のスタイル --- */
p {
    color: #6c757d;
    font-size: 0.9em;
}
address {
    margin-top: 2em;
    text-align: center;
    font-style: normal;
    color: #6c757d;
}
        `;
        document.head.appendChild(style);
    });
})();