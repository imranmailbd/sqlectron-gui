import { clipboard } from 'electron';
import React, { Component, PropTypes } from 'react';
import Loader from './loader.jsx';
import Message from './message.jsx';


export default class QueryResult extends Component {
  static propTypes = {
    query: PropTypes.string,
    fields: PropTypes.array,
    rows: PropTypes.array,
    rowCount: PropTypes.oneOfType([
      React.PropTypes.array,
      React.PropTypes.number,
    ]),
    affectedRows: PropTypes.oneOfType([
      React.PropTypes.array,
      React.PropTypes.number,
    ]),
    isExecuting: PropTypes.bool,
    error: PropTypes.object,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      (!nextProps.isExecuting && this.props.isExecuting) ||
      (nextProps.query !== this.props.query) ||
      (nextState.copied !== this.state.copied)
    );
  }

  componentWillUpdate(nextProps) {
    const renderingResults = !nextProps.isExecuting && this.props.isExecuting;
    if (renderingResults && this.refs.loader) {
      const loader = this.refs.loader.getElementsByClassName('text loader')[0];
      loader.innerText = 'Rendering result';
    }
  }

  componentDidUpdate() {
    if (this.state.copied) {
      /* eslint react/no-did-update-set-state: 0 */
      setTimeout(() => this.setState({ copied: false }), 1500);
    }
  }

  onClickCopyToClipboard(rows) {
    clipboard.writeText(JSON.stringify(rows, null, 2));
    this.setState({ copied: true });
  }

  renderQueryResult({ fields, rows, rowCount, affectedRows, queryIndex, totalQueries }) {
    const queryWithOutput = !!(fields && fields.length);
    if (!queryWithOutput && affectedRows !== undefined) {
      const msgAffectedRows = affectedRows ? `Affected rows: ${affectedRows}.` : '';
      return (
        <Message
          key={queryIndex}
          message={`Query executed successfully. ${msgAffectedRows}`}
          type="success" />
      );
    }

    const tableResult = (
      <table key={queryIndex} className="ui selectable small celled table">
        <thead>
          <tr>
            {fields.map(({ name }) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {this.renderQueryResultRows({ fields, rows, rowCount })}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={fields.length}>
              Rows: {rowCount}
              <button className="ui icon button"
                style={{float: 'right'}}
                title="Copy as JSON to clipboard"
                onClick={() => this.onClickCopyToClipboard(rows)}>
                <i className="copy icon"></i>
                {this.state.copied && 'Copied'}
              </button>
            </th>
          </tr>
        </tfoot>
      </table>
    );

    if (totalQueries === 1) {
      return tableResult;
    }

    return (
      <div key={queryIndex} className="ui segment">
        <div className="ui top left attached label">
          Query {queryIndex + 1}
        </div>
        {tableResult}
      </div>
    );
  }

  renderQueryResultRows({ fields, rows, rowCount }) {
    if (!rowCount) {
      return (
        <tr>
          <td colSpan={fields.length}>No results found</td>
        </tr>
      );
    }

    return rows.map((row, index) => {
      const columnNames = Object.keys(row);
      return (
        <tr key={index}>
          {columnNames.map(name => {
            return <td key={name}>{valueToString(row[name])}</td>;
          })}
        </tr>
      );
    });
  }

  render() {
    const { isExecuting, error, rows, fields, rowCount, affectedRows } = this.props;
    if (error) {
      if (error.message) {
        return <div className="ui negative message">{error.message}</div>;
      }
      return <pre>{JSON.stringify(error, null, 2)}</pre>;
    }

    if (isExecuting) {
      return (
        <div ref="loader" style={{minHeight: '250px'}}>
          <Loader message="Loading" type="active" inverted />
        </div>
      );
    }

    if (!rows) {
      return null;
    }

    const isMultipleResult = fields && fields.length && Array.isArray(fields[0]);
    const _fields = isMultipleResult ? fields : [fields];
    const _rows = isMultipleResult ? rows : [rows];
    const _rowsCount = isMultipleResult ? rowCount : [rowCount];
    const _affectedRows = isMultipleResult ? affectedRows : [affectedRows];
    const totalQueries = _fields.length;

    return (
      <div style={{overflowY: 'scroll'}}>
        {
          _fields.map((field, idx) => this.renderQueryResult({
            totalQueries,
            fields: _fields[idx],
            rows: _rows[idx],
            rowCount: _rowsCount[idx],
            affectedRows: _affectedRows[idx],
            queryIndex: idx,
          }))
        }
      </div>
    );
  }
}


function valueToString(value) {
  if (!value) { return value; }
  if (value.toISOString) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}
