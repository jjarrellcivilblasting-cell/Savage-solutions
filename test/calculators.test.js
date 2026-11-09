import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardFeet,logScale,jobQuote,labor,number} from '../calculators.js';
test('board feet and Doyle rule match known examples',()=>{assert.equal(boardFeet(1.5,6,8,10),60);assert.equal(logScale(14,8),50);});
test('job quote uses gross margin, not markup',()=>{const q=jobQuote(20,40,600,300,25);assert.equal(q.cost,1700);assert.ok(Math.abs(q.quote-2266.6666667)<0.001);assert.ok(Math.abs(q.profit/q.quote-0.25)<0.0001);});
test('labor counts crew hours',()=>assert.deepEqual(labor(3,8,35),{hours:24,cost:840}));
test('reject invalid inputs instead of silently returning misleading results',()=>{
  for(const value of ['', ' ',null,undefined,NaN,Infinity,-1,'abc',true,[],{}])assert.throws(()=>number(value,'Value'));
  for(const args of [[0,6,8,10],[-1.5,6,8,10],[1.5,6,8,1.5]])assert.throws(()=>boardFeet(...args));
  for(const diameter of [0,4,-14])assert.throws(()=>logScale(diameter,8));
  for(const margin of [-1,96,100,101])assert.throws(()=>jobQuote(20,40,600,300,margin));
  assert.throws(()=>labor(1.5,8,35));assert.throws(()=>labor(0,8,35));assert.throws(()=>labor(3,-8,35));
});
