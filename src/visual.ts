/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
'use strict';

import powerbi from 'powerbi-visuals-api';
import { FormattingSettingsService } from 'powerbi-visuals-utils-formattingmodel';
import './../style/visual.less';

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import * as React from 'react';
import * as xlsx from 'xlsx';
import { createRoot, Root } from 'react-dom/client';
import BryntumGanttComponent from './BryntumGanttComponent';
import { VisualFormattingSettingsModel } from './settings';

export class Visual implements IVisual {
    private target: HTMLElement;
    private updateCount: number;
    private textNode: Text;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private root: Root;
    private updateState: (newState: any) => void;

    constructor(options: VisualConstructorOptions) {
        this.updateState = () => {};

        this.target = options.element;
        this.root = createRoot(this.target);

        const reactRoot = React.createElement(BryntumGanttComponent, {
            updateCallback : (updateFunc: (newState: any) => void) => {
                this.updateState = updateFunc;
            }
        });

        this.root.render(reactRoot);
    }

    public update(options: VisualUpdateOptions) {
        const dataView = options.dataViews[0];

        if (dataView && dataView.table) {
            // Extract data from Power BI table dataView
            const columns = dataView.table.columns;
            const rows = dataView.table.rows;

            // Find column indices by display name
            const idIndex = columns.findIndex((col: any) => col.displayName === 'ID');
            const taskNameIndex = columns.findIndex((col: any) => col.displayName === 'Task Name');
            const startDateIndex = columns.findIndex((col: any) => col.displayName === 'Start Date');
            const endDateIndex = columns.findIndex((col: any) => col.displayName === 'End Date');
            const percentDoneIndex = columns.findIndex((col: any) => col.displayName === 'Percent Done');
            const manuallyScheduledIndex = columns.findIndex((col: any) => col.displayName === 'Manually Scheduled');
            const parentIndexIndex = columns.findIndex((col: any) => col.displayName === 'Parent Index');

            if (rows && rows.length > 0) {
                // Sort rows by parentIndex
                const sortedRows = [...rows].sort((a: any, b: any) => {
                    if (parentIndexIndex >= 0) {
                        return (a[parentIndexIndex] || 0) - (b[parentIndexIndex] || 0);
                    }
                    return 0;
                });

                const tasks = sortedRows
                    .filter((row: any) => {
                        const taskName = taskNameIndex >= 0 ? row[taskNameIndex] : null;
                        return taskName &&
                                taskName !== null &&
                                taskName !== undefined &&
                                typeof taskName === 'string' &&
                                taskName.trim() !== '';
                    })
                    .map((row: any, index: number) => {
                        const task = {
                            id                : idIndex >= 0 ? row[idIndex] : index + 1,
                            name              : taskNameIndex >= 0 ? row[taskNameIndex] : `Task ${index + 1}`,
                            startDate         : startDateIndex >= 0 ? this.convertExcelDate(row[startDateIndex]) : new Date().toISOString().split('T')[0],
                            endDate           : endDateIndex >= 0 ? this.convertExcelDate(row[endDateIndex]) : new Date().toISOString().split('T')[0],
                            percentDone       : percentDoneIndex >= 0 ? row[percentDoneIndex] : 0,
                            manuallyScheduled : manuallyScheduledIndex >= 0 ? Boolean(row[manuallyScheduledIndex]) : true,
                            parentIndex       : parentIndexIndex >= 0 ? row[parentIndexIndex] : undefined
                        };
                        return task;
                    });

                this.updateState({ tasks });
            }
        }
    }

    private convertExcelDate(excelDate: any): string {
        if (typeof excelDate === 'number') {
            // Use xlsx library to parse Excel date numbers
            const dateObj = xlsx.SSF.parse_date_code(excelDate);
            const date = new Date(
                dateObj.y,
                dateObj.m - 1, // months are zero-indexed in JavaScript
                dateObj.d,
                dateObj.H,
                dateObj.M,
                dateObj.S
            );
            return date.toISOString().split('T')[0];
        }
        // If it's already a string date, return as is
        if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return excelDate;
        }
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property.
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}