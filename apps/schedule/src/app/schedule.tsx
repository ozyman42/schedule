import * as React from 'react';
import styled from '@emotion/styled';
import fontColorContrast from 'font-color-contrast';
import rgbHex from 'rgb-hex';

enum Category {
    DeepWork = 'Deep Work',
    Exercise = 'Exercise',
    Education = 'Education',
    Contemplation = 'Contemplation',
    Maintenance = 'Maintenance',
    Social = 'Social',
    Trading = 'Trading'
}

const CATEGORY_COLOR: {[c in Category]: string} = {
    [Category.DeepWork]: 'rgb(0, 255, 255)',
    [Category.Exercise]: 'rgb(191, 144, 0)',
    [Category.Education]: 'rgb(204, 204, 204)',
    [Category.Contemplation]: 'rgb(100, 126, 107)',
    [Category.Maintenance]: 'rgb(255, 242, 204)',
    [Category.Social]: 'rgb(180, 167, 214)',
    [Category.Trading]: 'rgb(0, 255, 0)'
}
const HOURS_IN_BED = 9;
const TIME_BLOCK_LENGTH = 15;
const TOTAL_TIME_BLOCKS = (24 - HOURS_IN_BED) * 60 / TIME_BLOCK_LENGTH;

const LOCAL_STORAGE_KEY = "ozy-schedule";
const localStorageContents = localStorage.getItem(LOCAL_STORAGE_KEY);
const INITIAL_SCHEDULE_STATE: ScheduleState = localStorageContents !== null ? JSON.parse(localStorageContents) : {
    times: Array(7).fill(Array(TOTAL_TIME_BLOCKS).fill(undefined)),
    optionsByName: {},
    wakeUpAt: (60 / TIME_BLOCK_LENGTH) * 5
};
if (localStorageContents !== null) {
    INITIAL_SCHEDULE_STATE.times.forEach(timeSlots => {
        for (const timeSlotIndex in timeSlots) {
            if (timeSlots[timeSlotIndex] === null) { // JSON stringify converts undefined to null when we save to local storage, so we need to undo this.
                timeSlots[timeSlotIndex] = undefined;
            }
        }
    })
    const ops = Object.keys(INITIAL_SCHEDULE_STATE.optionsByName);
    ops.sort();
    INITIAL_SCHEDULE_STATE.optionsByName = Object.fromEntries(ops.map(op => [op, INITIAL_SCHEDULE_STATE.optionsByName[op]]));
}

type ScheduleState = {
    times: (string | undefined)[][], // First index = day. Second index = hour. Value = name of option
    optionsByName: Record<string, Category>;
    wakeUpAt: number;
}

const Table: React.FC<{children: (React.ReactNode | React.ReactNode[]), headers: string[], title: string}> = ({children, headers, title}) =>
<table style={{display: 'flex'}}>
    <tbody>
        <tr>
            <th colSpan={headers.length}>{title}</th>
        </tr>
        <tr>
            {headers.map(header => <th key={header}>{header}</th>)}
        </tr>
        {children}
    </tbody>
</table>

const DIVIDER_THICKNESS = 25;
const VerticalDivider: React.FC = () => <div style={{display: 'flex', background: 'black', width: DIVIDER_THICKNESS}} />
const HorizontalDivider: React.FC = () => <div style={{display: 'flex', background: 'black', height: DIVIDER_THICKNESS}} />

function getHourMinuteHalf(timeIndex: number): {minute: number, hour: number, am: boolean} {
    const minutesFromMidnight = timeIndex * TIME_BLOCK_LENGTH;
    const hour = Math.floor(minutesFromMidnight / 60);
    const am = hour % 24 < 12;
    const minute = minutesFromMidnight % 60;
    const adjustedHour = 
        hour % 12 === 0 ? 12 :
        hour % 12;
    return {hour: adjustedHour, minute, am};
}

function getHourMinuteHalfDisplay(timeBlockIndex: number, wakeUpAt: number): string {
    const {hour, minute, am} = getHourMinuteHalf(wakeUpAt + timeBlockIndex);
    return `${hour}:${`${minute}`.padStart(2, '0')} ${am ? "AM" : "PM"}`;
}

const Container = styled.div`
    display: flex;
    flex-direction: row;
    th {
        background: orange;
    }
    td, th {
        padding: 0 25px;
    }
`

const NewActivity: React.FC<{onNew: (activity: string, category: Category) => void, existingActivities: Set<string>}> = ({onNew, existingActivities}) => {
    const [activityName, setActivityName] = React.useState("");
    const [category, setCategory] = React.useState(Category.DeepWork);
    return <Table title='New Activity' headers={['Name', 'Category', '']}>
        <tr>
            <td style={{padding: 0}}>
                <input type="text" value={activityName} onChange={e => { setActivityName(e.target.value); }} />
            </td>
            <td>
                <select value={category} onChange={e => { setCategory(e.target.value as Category) }}>
                    {Object.values(Category).map(curCategory => <option key={curCategory}>
                        {curCategory}
                    </option>)}
                </select>
            </td>
            <td>
                {activityName.length > 0 && !existingActivities.has(activityName) && <input type="submit" onClick={() => { onNew(activityName, category); setActivityName(""); }} />}
            </td>
        </tr>
    </Table>
}

const STYLE_CACHE: Record<Category, React.CSSProperties> = Object.fromEntries(Object.values(Category)
    .map((category: Category) => [category, {background: CATEGORY_COLOR[category], color: fontColorContrast(`#${rgbHex(CATEGORY_COLOR[category])}`)}])) as Record<Category, React.CSSProperties>;

function hoursPerWeek(minutes: number): number {
    return minutes / 60;
}

function hoursPerDay(minutes: number): number {
    return Math.round(minutes / 60 / 7 * 1000) / 1000;
}

const ActivityRow: React.FC<{name: string, category: Category, minutes: number, takenNames: Set<string>, onCategoryChange: (newC: Category) => void, onNameChange: (newName: string) => void, onDelete: () => void}> = 
({name, category, minutes, takenNames, onCategoryChange, onNameChange, onDelete}) => {
    const [newName, setNewName] = React.useState(name);
    const [editing, setEditing] = React.useState(false);
    const style = STYLE_CACHE[category];
    return <tr>
        <td style={style}>
            {editing && <>
                <input type="text" value={newName} onChange={e => { setNewName(e.target.value); }} />
                <br />
                <select value={category} onChange={e => { onCategoryChange(e.target.value as Category); }}>
                    {Object.values(Category).map(c => <option key={c}>{c}</option>)}
                </select>
            </>}
            {!editing && name}
        </td>
        <td style={style}>{hoursPerWeek(minutes)}</td>
        <td style={style}>{hoursPerDay(minutes)}</td>
        <td style={{padding: 0}}>
            {!editing && <input type="button" value="✎" onClick={() => { setEditing(true); setNewName(name); }} />}
            {editing && newName !== name && newName.length > 0 && !takenNames.has(newName) && <input type="button" value="☑" onClick={() => { setEditing(false); onNameChange(newName); setNewName(""); }} />}
            {editing && <input type="button" value="Stop Editing" onClick={() => { setEditing(false); }} />}
            {minutes === 0 && <input type="button" value="Delete" onClick={() => { onDelete(); }} />}
        </td>
</tr>
}

const WakeUpAt: React.FC<{currentIndex: number, onChange: (newIndex: number) => void}> = ({currentIndex, onChange}) => {
    const {hour, minute, am} = getHourMinuteHalf(currentIndex);
    function setIndex(h: number, m: number, ampm: boolean) {
        const hAdjusted = ampm ? (h === 12 ? 0 : h) : (h === 12 ? h : h + 12);
        const blocksPerHour = 60 / TIME_BLOCK_LENGTH;
        const newIndex = (hAdjusted * blocksPerHour) + (m / TIME_BLOCK_LENGTH);
        onChange(newIndex);
    }
    
    const hourSelection = (new Array(12)).fill(0).map((_, i) => i);
    hourSelection[0] = 12;

    const minuteSelection = new Array(60 / TIME_BLOCK_LENGTH).fill(0).map((_, i) => i * TIME_BLOCK_LENGTH);
    
    return <div style={{padding: 10}}>
        Wake up at
        <span style={{display: 'inline-block', width: 10}}></span>
        <select value={hour} onChange={e => { setIndex(parseInt(e.target.value), minute, am); }}>
            {hourSelection.map(h => <option value={h} key={h}>{h}</option>)}
        </select>
        <span style={{display: 'inline-block', width: 5}}></span>:<span style={{display: 'inline-block', width: 5}}></span>
        <select value={minute} onChange={e => { setIndex(hour, parseInt(e.target.value), am); }}>{minuteSelection.map(min => <option value={min} key={min}>{`${min}`.padStart(2, "0")}</option>)}</select>
        <select value={am ? 0 : 1} onChange={e => { setIndex(hour, minute, parseInt(e.target.value) === 0); }}><option value={0}>AM</option><option value={1}>PM</option></select>
    </div>
}

export const Schedule: React.FC = () => {
    const [scheduleState, setScheduleState] = React.useState(INITIAL_SCHEDULE_STATE);
    
    const optionsByCategory: Record<Category, {options: string[], totalMinutes: number}> = 
        Object.fromEntries(Object.values(Category).map(category => [category as Category, {options: [] as string[], totalMinutes: 0}])) as Record<Category, {options: string[], totalMinutes: number}>;

    const minutesPerOption: Record<string, number> = {};
    const optionsSet = new Set<string>();
    Object.entries(scheduleState.optionsByName).forEach(([name, category]) => {
        optionsByCategory[category].options.push(name);
        optionsSet.add(name);
        minutesPerOption[name] = 0;
    });
    
    for (const day in scheduleState.times) {
        const timeSlots = scheduleState.times[day];
        for (const time in timeSlots) {
            const option = timeSlots[time];
            if (option !== undefined) {
                minutesPerOption[option] += TIME_BLOCK_LENGTH;
                const category = optionsByCategory[scheduleState.optionsByName[option]];
                category.totalMinutes += TIME_BLOCK_LENGTH;
            }
        }
    }

    function download() {
        const current = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? "");
        const link = document.createElement("a");
        const now = new Date();
        const dateDisplay = now.toLocaleString('en-us', {timeZone: 'America/Los_Angeles', timeZoneName: 'short'}).split(", ").join("_").split(":").join("-").split(" ").join("_").split("/").join("-");
        link.download = `schedule-${dateDisplay}.json`;
        const blob = new Blob([JSON.stringify(current, null, 4)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        link.remove();
    }

    function upload() {
        const input = document.createElement("input");
        input.type = 'file';
        input.onchange = () => {
            const reader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            reader.readAsText(input.files![0]);
            reader.onload = (e) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                saveState(JSON.parse(e.target!.result as string));
                input.remove();
            }
        }
        input.click();
    }

    function saveState(newState: ScheduleState) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState, null, 4));
        setScheduleState(newState);
    }
    
    function newActivity(activity: string, category: Category) {
        const newState = {...scheduleState};
        const newOptions = {...scheduleState.optionsByName};
        newOptions[activity] = category;
        const newOptionsSorted = Object.fromEntries(Object.keys(newOptions).sort().map(option => [option, newOptions[option]]));
        newState.optionsByName = newOptionsSorted;
        saveState(newState);
    }

    function changeCategory(activity: string, newCategory: Category) {
        newActivity(activity, newCategory);
    }

    function changeName(activity: string, newActivity: string) {
        const newState = {...scheduleState};
        const newOptions = {...scheduleState.optionsByName};
        const category = newOptions[activity];
        delete newOptions[activity];
        newOptions[newActivity] = category;
        const newOptionsSorted = Object.fromEntries(Object.keys(newOptions).sort().map(option => [option, newOptions[option]]));
        newState.optionsByName = newOptionsSorted;
        const newTimes = [...scheduleState.times];
        for (const day in newTimes) {
            const newMinutes = [...newTimes[day]];
            for (const time in newMinutes) {
                if (newMinutes[time] === activity) {
                    newMinutes[time] = newActivity;
                }
            }
            newTimes[day] = newMinutes;
        }
        newState.times = newTimes;
        saveState(newState);
    }

    function deleteActivity(activity: string) {
        const newState = {...scheduleState};
        const newOptions = {...scheduleState.optionsByName};
        delete newOptions[activity];
        newState.optionsByName = newOptions;
        const newTimes = [...scheduleState.times];
        for (const day in newTimes) {
            const newMinutes = [...newTimes[day]];
            for (const time in newMinutes) {
                if (newMinutes[time] === activity) {
                    newMinutes[time] = undefined;
                }
            }
            newTimes[day] = newMinutes;
        }
        newState.times = newTimes;
        saveState(newState);
    }

    function setActivityAtTime(activity: string | undefined, day: number, timeSlot: number) {
        const newState = {...scheduleState};
        const newTimes = [...scheduleState.times];
        const newTimesForDay = [...newTimes[day]];
        newTimesForDay[timeSlot] = activity;
        newTimes[day] = newTimesForDay;
        newState.times = newTimes;
        saveState(newState);
    }

    return (
        <Container>
            <Table title="Schedule" headers={['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}>
                {scheduleState.times[0].map((_, timeBlockIndex) =>
                    <tr key={timeBlockIndex}>
                        <th style={{textAlign: 'right'}} >{getHourMinuteHalfDisplay(timeBlockIndex, scheduleState.wakeUpAt)}</th>
                        {scheduleState.times.map((optionsForDay, dayIndex) => {
                            const activity = optionsForDay[timeBlockIndex];
                            const activityIsSet = activity !== undefined;
                            return <td key={dayIndex} style={activityIsSet ? STYLE_CACHE[scheduleState.optionsByName[activity]] : {}}>
                                <select value={activityIsSet ? activity : ""}
                                    onChange={e => { setActivityAtTime(e.target.value === "" ? undefined : e.target.value as Category, dayIndex, timeBlockIndex); }}
                                >
                                    <option value={""}></option>
                                    {Array.from(optionsSet).map(c => <option key={c}>{c}</option>)}
                                </select>
                            </td>
                        })}
                    </tr>
                )}
            </Table>
            <VerticalDivider />
            <div>
                <Table title="Categories" headers={['Category', 'Hours Per Week', 'Hours Per Day']}>
                    {Object.entries(optionsByCategory).map(([category, {options, totalMinutes}]) => {
                        const style = STYLE_CACHE[category as Category];
                        return <tr key={category}>
                            <td style={style}>{category}</td>
                            <td style={style}>{hoursPerWeek(totalMinutes)}</td>
                            <td style={style}>{hoursPerDay(totalMinutes)}</td>
                        </tr>
                    })}
                </Table>
                <HorizontalDivider />
                <div style={{padding: 10}}>
                    <input type="button" value="Download" onClick={download} />
                    <span style={{display: 'inline-block', width: 20}}></span>
                    <input type="button" value="Upload" onClick={upload} />
                </div>
                <HorizontalDivider />
                <WakeUpAt currentIndex={scheduleState.wakeUpAt} onChange={i => { const newState = {...scheduleState}; newState.wakeUpAt = i; saveState(newState); }} />
            </div>
            <VerticalDivider />
            <div>
                <Table title="Activity" headers={['Activity', 'Hours Per Week', 'Hours Per Day']}>
                    {Object.entries(optionsByCategory).filter(([_, {options}]) => options.length > 0).map(([category, {options, totalMinutes}]) => {
                        const style = STYLE_CACHE[category as Category];
                        return <React.Fragment key={category}>
                            <tr>
                                <th colSpan={3} style={style}>{category}</th>
                            </tr>
                            {options.map(option => <ActivityRow 
                                name={option} category={category as Category} minutes={minutesPerOption[option]} takenNames={optionsSet}
                                onCategoryChange={c => { changeCategory(option, c); }} onNameChange={n => { changeName(option, n); }} onDelete={() => { deleteActivity(option); }}
                            />)}
                        </React.Fragment>
                    })}
                </Table>
                <HorizontalDivider />
                <NewActivity onNew={newActivity} existingActivities={optionsSet} />
            </div>
        </Container>
    )
}